-- Trade-count baseline: completed-trade count at the moment money last
-- entered PRINCIPAL (deposit approval or wallet transfer-in). The
-- early-exit withdrawal penalty applies until
-- (completed trades - baseline) reaches the 70%-of-plan threshold.
ALTER TABLE "users" ADD COLUMN "trade_count_baseline" INTEGER NOT NULL DEFAULT 0;
