-- Merge existing DEPOSIT_BONUS wallet balances into the user's PRINCIPAL
-- wallet. The deposit bonus no longer lives in a separate wallet; new
-- bonuses are credited straight to PRINCIPAL by the deposit service.
DO $$
DECLARE
  bonus_wallet RECORD;
  principal_wallet RECORD;
BEGIN
  FOR bonus_wallet IN
    SELECT * FROM wallets WHERE type = 'DEPOSIT_BONUS' AND balance > 0
  LOOP
    SELECT * INTO principal_wallet
    FROM wallets
    WHERE user_id = bonus_wallet.user_id AND type = 'PRINCIPAL'
    FOR UPDATE;

    IF principal_wallet.id IS NULL THEN
      CONTINUE;
    END IF;

    -- Ledger: debit out of the bonus wallet
    INSERT INTO ledgers (
      id, user_id, wallet_id, type, "referenceType",
      before_balance, after_balance, credit, debit,
      description, metadata, "createdAt"
    ) VALUES (
      gen_random_uuid(), bonus_wallet.user_id, bonus_wallet.id,
      'ADJUSTMENT', NULL,
      bonus_wallet.balance, 0, 0, bonus_wallet.balance,
      'Deposit bonus merged into principal wallet', NULL, NOW()
    );

    -- Ledger: credit into the principal wallet
    INSERT INTO ledgers (
      id, user_id, wallet_id, type, "referenceType",
      before_balance, after_balance, credit, debit,
      description, metadata, "createdAt"
    ) VALUES (
      gen_random_uuid(), bonus_wallet.user_id, principal_wallet.id,
      'ADJUSTMENT', NULL,
      principal_wallet.balance, principal_wallet.balance + bonus_wallet.balance,
      bonus_wallet.balance, 0,
      'Deposit bonus merged into principal wallet', NULL, NOW()
    );

    UPDATE wallets
    SET balance = principal_wallet.balance + bonus_wallet.balance,
        total_credit = principal_wallet.total_credit + bonus_wallet.balance,
        "updatedAt" = NOW()
    WHERE id = principal_wallet.id;

    UPDATE wallets
    SET balance = 0,
        total_debit = bonus_wallet.total_debit + bonus_wallet.balance,
        "updatedAt" = NOW()
    WHERE id = bonus_wallet.id;
  END LOOP;
END $$;
