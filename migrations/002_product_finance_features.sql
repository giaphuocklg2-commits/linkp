BEGIN;

CREATE TABLE IF NOT EXISTS public."RemoteConfig" (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text NOT NULL DEFAULT '',
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public."RemoteConfig" (key, value, description) VALUES
  ('share_rate', '80', 'Phần trăm hoa hồng chia cho người dùng'),
  ('minimum_withdrawal', '10000', 'Số tiền rút tối thiểu'),
  ('home_banner', '{"enabled":true,"title":"Hoàn tiền cùng LinkP","message":"Theo dõi cashback minh bạch theo từng giai đoạn","actionUrl":""}', 'Banner trang chủ')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public."WalletLedger" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  type text NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('AVAILABLE','PENDING','PENDING_WITHDRAWAL','WITHDRAWN')),
  direction text NOT NULL CHECK (direction IN ('CREDIT','DEBIT')),
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'POSTED' CHECK (status IN ('PENDING','POSTED','REVERSED')),
  "balanceAfter" numeric,
  "orderId" text,
  "withdrawalId" text,
  description text NOT NULL DEFAULT '',
  "idempotencyKey" text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_ledger_user_created_idx ON public."WalletLedger" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS wallet_ledger_order_idx ON public."WalletLedger" ("orderId") WHERE "orderId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."ReferralEvent" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "referrerId" text NOT NULL,
  "referredUserId" text,
  type text NOT NULL CHECK (type IN ('CLICK','SIGNUP','QUALIFIED_ORDER','COMMISSION')),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  "orderId" text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_event_referrer_created_idx ON public."ReferralEvent" ("referrerId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS public."SystemStatus" (
  component text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('OPERATIONAL','DEGRADED','OUTAGE','MAINTENANCE')),
  message text NOT NULL DEFAULT '',
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public."SystemStatus" (component, status, message) VALUES
  ('link_conversion','OPERATIONAL','Chuyển đổi link hoạt động bình thường'),
  ('order_tracking','OPERATIONAL','Theo dõi đơn hàng hoạt động bình thường'),
  ('cashback','OPERATIONAL','Đối soát cashback hoạt động bình thường'),
  ('withdrawal','OPERATIONAL','Rút tiền hoạt động bình thường')
ON CONFLICT (component) DO NOTHING;

CREATE TABLE IF NOT EXISTS public."ReconciliationHistory" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  status text NOT NULL CHECK (status IN ('RUNNING','COMPLETED','PARTIAL','FAILED')),
  "ordersChecked" integer NOT NULL DEFAULT 0,
  "ordersApproved" integer NOT NULL DEFAULT 0,
  "cashbackAmount" numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  "reconciledAt" timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(
  p_user_id text, p_user_name text, p_amount numeric, p_bank_name text,
  p_account_number text, p_account_holder text, p_note text, p_qr_url text,
  p_idempotency_key text
) RETURNS SETOF public."WithdrawalRequest"
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet public."Wallet"%ROWTYPE;
  v_minimum numeric := 10000;
  v_request public."WithdrawalRequest"%ROWTYPE;
BEGIN
  SELECT COALESCE((value #>> '{}')::numeric, 10000) INTO v_minimum
  FROM public."RemoteConfig" WHERE key = 'minimum_withdrawal';

  IF p_amount < v_minimum THEN RAISE EXCEPTION 'MINIMUM_WITHDRAWAL:%', v_minimum; END IF;

  SELECT * INTO v_request FROM public."WithdrawalRequest" WHERE "idempotencyKey" = p_idempotency_key;
  IF FOUND THEN RETURN NEXT v_request; RETURN; END IF;

  SELECT * INTO v_wallet FROM public."Wallet" WHERE "userId" = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_NOT_FOUND'; END IF;
  IF v_wallet.balance < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  INSERT INTO public."WithdrawalRequest" (
    id, "userId", "userName", amount, "bankName", "accountNumber", "accountHolder",
    status, note, "qrUrl", "idempotencyKey"
  ) VALUES (
    'w_req_' || replace(gen_random_uuid()::text, '-', ''), p_user_id, p_user_name, p_amount,
    p_bank_name, p_account_number, p_account_holder, 'PENDING', p_note, p_qr_url, p_idempotency_key
  ) RETURNING * INTO v_request;

  UPDATE public."Wallet" SET balance = balance - p_amount,
    "pendingWithdrawal" = COALESCE("pendingWithdrawal",0) + p_amount, "updatedAt" = now()
  WHERE "userId" = p_user_id;

  INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"balanceAfter","withdrawalId",description,"idempotencyKey")
  VALUES (p_user_id,'WITHDRAWAL_REQUEST','AVAILABLE','DEBIT',p_amount,'POSTED',v_wallet.balance-p_amount,v_request.id,p_note,'withdrawal:'||p_idempotency_key);

  RETURN NEXT v_request;
END $$;

CREATE OR REPLACE FUNCTION public.settle_affiliate_order(p_order_id text, p_status text)
RETURNS public."AffiliateOrder"
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public."AffiliateOrder"%ROWTYPE;
  v_old_status text;
  v_balance numeric;
BEGIN
  SELECT * INTO v_order FROM public."AffiliateOrder" WHERE id::text = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  v_old_status := v_order.status;
  IF v_old_status = p_status THEN RETURN v_order; END IF;

  INSERT INTO public."Wallet" (id,"userId","userName",balance,pending,withdrawn,"updatedAt")
  VALUES (gen_random_uuid(),v_order."userId",v_order."userName",0,0,0,now())
  ON CONFLICT ("userId") DO NOTHING;
  PERFORM 1 FROM public."Wallet" WHERE "userId"=v_order."userId" FOR UPDATE;

  IF v_order."userId" <> 'user_guest' AND v_old_status = 'PENDING' AND p_status = 'APPROVED' THEN
    UPDATE public."Wallet" SET pending=GREATEST(0,pending-v_order."userCashback"), balance=balance+v_order."userCashback", "updatedAt"=now()
    WHERE "userId"=v_order."userId" RETURNING balance INTO v_balance;
    INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"balanceAfter","orderId",description,"idempotencyKey")
    VALUES (v_order."userId",'CASHBACK_APPROVED','AVAILABLE','CREDIT',v_order."userCashback",'POSTED',v_balance,v_order.id::text,'Cashback đơn '||v_order."orderCode",'order:'||v_order.id::text||':approved') ON CONFLICT DO NOTHING;
  ELSIF v_order."userId" <> 'user_guest' AND v_old_status = 'PENDING' AND p_status = 'REJECTED' THEN
    UPDATE public."Wallet" SET pending=GREATEST(0,pending-v_order."userCashback"), "updatedAt"=now() WHERE "userId"=v_order."userId";
    INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"orderId",description,"idempotencyKey")
    VALUES (v_order."userId",'CASHBACK_REJECTED','PENDING','DEBIT',v_order."userCashback",'POSTED',v_order.id::text,'Cashback bị từ chối cho đơn '||v_order."orderCode",'order:'||v_order.id::text||':rejected') ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public."AffiliateOrder" SET status=p_status,
    "approvedAt"=CASE WHEN p_status='APPROVED' THEN COALESCE("approvedAt",now()) ELSE "approvedAt" END
  WHERE id::text=p_order_id RETURNING * INTO v_order;
  RETURN v_order;
END $$;

CREATE OR REPLACE FUNCTION public.apply_wallet_credit(
  p_user_id text, p_amount numeric, p_type text, p_description text, p_idempotency_key text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance numeric;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  IF EXISTS (SELECT 1 FROM public."WalletLedger" WHERE "idempotencyKey"=p_idempotency_key) THEN
    SELECT balance INTO v_balance FROM public."Wallet" WHERE "userId"=p_user_id; RETURN v_balance;
  END IF;
  UPDATE public."Wallet" SET balance=balance+p_amount,"updatedAt"=now() WHERE "userId"=p_user_id RETURNING balance INTO v_balance;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'WALLET_NOT_FOUND'; END IF;
  INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"balanceAfter",description,"idempotencyKey")
  VALUES (p_user_id,p_type,'AVAILABLE','CREDIT',p_amount,'POSTED',v_balance,p_description,p_idempotency_key);
  RETURN v_balance;
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  p_user_id text, p_balance numeric, p_pending numeric, p_withdrawn numeric, p_reason text, p_key text
) RETURNS public."Wallet"
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public."Wallet"%ROWTYPE; v_delta numeric;
BEGIN
  SELECT * INTO v FROM public."Wallet" WHERE "userId"=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_NOT_FOUND'; END IF;
  IF p_balance IS NOT NULL AND p_balance <> v.balance THEN
    v_delta:=p_balance-v.balance;
    INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"balanceAfter",description,"idempotencyKey")
    VALUES (p_user_id,'ADMIN_ADJUSTMENT','AVAILABLE',CASE WHEN v_delta>0 THEN 'CREDIT' ELSE 'DEBIT' END,abs(v_delta),'POSTED',p_balance,p_reason,p_key||':available');
  END IF;
  IF p_pending IS NOT NULL AND p_pending <> v.pending THEN
    v_delta:=p_pending-v.pending;
    INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,description,"idempotencyKey")
    VALUES (p_user_id,'ADMIN_ADJUSTMENT','PENDING',CASE WHEN v_delta>0 THEN 'CREDIT' ELSE 'DEBIT' END,abs(v_delta),'POSTED',p_reason,p_key||':pending');
  END IF;
  IF p_withdrawn IS NOT NULL AND p_withdrawn <> v.withdrawn THEN
    v_delta:=p_withdrawn-v.withdrawn;
    INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,description,"idempotencyKey")
    VALUES (p_user_id,'ADMIN_ADJUSTMENT','WITHDRAWN',CASE WHEN v_delta>0 THEN 'CREDIT' ELSE 'DEBIT' END,abs(v_delta),'POSTED',p_reason,p_key||':withdrawn');
  END IF;
  UPDATE public."Wallet" SET balance=COALESCE(p_balance,balance),pending=COALESCE(p_pending,pending),withdrawn=COALESCE(p_withdrawn,withdrawn),"updatedAt"=now()
  WHERE "userId"=p_user_id RETURNING * INTO v;
  RETURN v;
END $$;

COMMIT;
