BEGIN;

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

  IF v_order."userId" <> 'user_guest' THEN
    INSERT INTO public."Wallet" (id,"userId","userName",balance,pending,withdrawn,"updatedAt")
    VALUES (gen_random_uuid(),v_order."userId",v_order."userName",0,0,0,now())
    ON CONFLICT ("userId") DO NOTHING;
    PERFORM 1 FROM public."Wallet" WHERE "userId"=v_order."userId" FOR UPDATE;

    IF v_old_status = 'PENDING' AND p_status = 'APPROVED' THEN
      UPDATE public."Wallet" SET pending=GREATEST(0,pending-v_order."userCashback"), balance=balance+v_order."userCashback", "updatedAt"=now()
      WHERE "userId"=v_order."userId" RETURNING balance INTO v_balance;
      INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"balanceAfter","orderId",description,"idempotencyKey")
      VALUES (v_order."userId",'CASHBACK_APPROVED','AVAILABLE','CREDIT',v_order."userCashback",'POSTED',v_balance,v_order.id::text,'Cashback đơn '||v_order."orderCode",'order:'||v_order.id::text||':approved') ON CONFLICT DO NOTHING;
    ELSIF v_old_status = 'PENDING' AND p_status = 'REJECTED' THEN
      UPDATE public."Wallet" SET pending=GREATEST(0,pending-v_order."userCashback"), "updatedAt"=now() WHERE "userId"=v_order."userId";
      INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"orderId",description,"idempotencyKey")
      VALUES (v_order."userId",'CASHBACK_REJECTED','PENDING','DEBIT',v_order."userCashback",'POSTED',v_order.id::text,'Cashback bị từ chối cho đơn '||v_order."orderCode",'order:'||v_order.id::text||':rejected') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  UPDATE public."AffiliateOrder" SET status=p_status,
    "approvedAt"=CASE WHEN p_status='APPROVED' THEN COALESCE("approvedAt",now()) ELSE "approvedAt" END
  WHERE id::text=p_order_id RETURNING * INTO v_order;
  RETURN v_order;
END $$;

COMMIT;
