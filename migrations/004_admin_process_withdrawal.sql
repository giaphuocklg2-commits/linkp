BEGIN;

CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_withdrawal_id text, p_status text, p_trans_id text, p_note text, p_admin_id text
) RETURNS public."WithdrawalRequest"
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request public."WithdrawalRequest"%ROWTYPE;
  v_wallet public."Wallet"%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public."WithdrawalRequest" WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
  IF v_request.status <> 'PENDING' THEN RETURN v_request; END IF;

  SELECT * INTO v_wallet FROM public."Wallet" WHERE "userId" = v_request."userId" FOR UPDATE;
  
  IF p_status = 'APPROVED' THEN
    UPDATE public."Wallet" SET 
      "pendingWithdrawal" = GREATEST(0, "pendingWithdrawal" - v_request.amount),
      withdrawn = withdrawn + v_request.amount,
      "updatedAt" = now()
    WHERE "userId" = v_request."userId";

    INSERT INTO public."WalletLedger" ("userId", type, bucket, direction, amount, status, "withdrawalId", description, "idempotencyKey")
    VALUES (v_request."userId", 'WITHDRAWAL_APPROVED', 'PENDING_WITHDRAWAL', 'DEBIT', v_request.amount, 'POSTED', v_request.id, 'Duyệt rút tiền', 'withdrawal_approve:'||v_request.id);
  ELSIF p_status = 'REJECTED' THEN
    UPDATE public."Wallet" SET 
      "pendingWithdrawal" = GREATEST(0, "pendingWithdrawal" - v_request.amount),
      balance = balance + v_request.amount,
      "updatedAt" = now()
    WHERE "userId" = v_request."userId";

    INSERT INTO public."WalletLedger" ("userId", type, bucket, direction, amount, status, "withdrawalId", description, "idempotencyKey")
    VALUES (v_request."userId", 'WITHDRAWAL_REJECTED', 'AVAILABLE', 'CREDIT', v_request.amount, 'POSTED', v_request.id, 'Từ chối rút tiền: '||COALESCE(p_note,''), 'withdrawal_reject:'||v_request.id);
  END IF;

  UPDATE public."WithdrawalRequest" SET 
    status = p_status, 
    "transId" = COALESCE(p_trans_id, "transId"), 
    note = COALESCE(p_note, note), 
    "processedAt" = now()
  WHERE id = p_withdrawal_id RETURNING * INTO v_request;
  
  RETURN v_request;
END $$;

COMMIT;
