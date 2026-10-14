export const LEDGER_ERRORS = {
  LEDGER_NOT_FOUND: 'Ledger entry not found',
  INVALID_AMOUNT: 'Invalid amount',
  INVALID_BALANCE: 'Invalid balance calculation',
  WALLET_NOT_FOUND: 'Wallet not found',
} as const;

export const LEDGER_SUCCESS = {
  ENTRY_CREATED: 'Ledger entry created successfully',
} as const;
