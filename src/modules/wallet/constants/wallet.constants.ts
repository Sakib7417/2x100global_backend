export const WALLET_ERRORS = {
  WALLET_NOT_FOUND: 'Wallet not found',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_WALLET_TYPE: 'Invalid wallet type',
  NEGATIVE_AMOUNT: 'Amount must be positive',
  ZERO_AMOUNT: 'Amount must be greater than zero',
} as const;

export const WALLET_SUCCESS = {
  BALANCE_UPDATED: 'Balance updated successfully',
  WALLETS_CREATED: 'Wallets created successfully',
} as const;
