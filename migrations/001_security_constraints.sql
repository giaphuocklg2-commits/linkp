BEGIN;

ALTER TABLE public."Wallet"
  ADD COLUMN IF NOT EXISTS "pendingWithdrawal" numeric NOT NULL DEFAULT 0,
  ADD CONSTRAINT wallet_nonnegative CHECK (balance >= 0 AND pending >= 0 AND withdrawn >= 0 AND "pendingWithdrawal" >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_user_unique ON public."Wallet" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_order_code_source_unique ON public."AffiliateOrder" ("orderCode", COALESCE("subId", ''));
CREATE INDEX IF NOT EXISTS affiliate_order_user_created_idx ON public."AffiliateOrder" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS withdrawal_user_created_idx ON public."WithdrawalRequest" ("userId", "createdAt" DESC);

ALTER TABLE public."AffiliateOrder"
  ADD CONSTRAINT affiliate_order_amounts_nonnegative CHECK ("orderValue" >= 0 AND "shopeeCommission" >= 0 AND "userCashback" >= 0 AND "adminRevenue" >= 0),
  ADD CONSTRAINT affiliate_order_status_valid CHECK (status IN ('PENDING','APPROVED','REJECTED'));

ALTER TABLE public."WithdrawalRequest"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" text,
  ADD CONSTRAINT withdrawal_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT withdrawal_status_valid CHECK (status IN ('PENDING','APPROVED','REJECTED','PAID'));
CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_idempotency_unique ON public."WithdrawalRequest" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."Voucher" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), shop text NOT NULL, scope text NOT NULL DEFAULT '', title text NOT NULL,
  code text NOT NULL UNIQUE, meta text NOT NULL DEFAULT '', link text NOT NULL, active boolean NOT NULL DEFAULT true,
  "expiresAt" date, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public."AuditLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor text NOT NULL, action text NOT NULL, target text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, "createdAt" timestamptz NOT NULL DEFAULT now()
);

COMMIT;
