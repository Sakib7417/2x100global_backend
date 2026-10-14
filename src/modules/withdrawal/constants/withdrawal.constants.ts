export const WITHDRAWAL_ERRORS = {
  WITHDRAWAL_NOT_FOUND: 'Withdrawal not found',
  INVALID_AMOUNT: 'Invalid withdrawal amount',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_WALLET_ADDRESS: 'Invalid wallet address',
  MINIMUM_WITHDRAWAL: `Minimum withdrawal is 10 USDT`,
  WITHDRAWAL_ALREADY_PROCESSED: 'Withdrawal already processed',
  CANNOT_PROCESS_PENDING: 'Cannot process pending withdrawal',
  INVALID_STATUS: 'Invalid withdrawal status',
} as const;

export const WITHDRAWAL_SUCCESS = {
  WITHDRAWAL_CREATED: 'Withdrawal created successfully',
  WITHDRAWAL_PROCESSED: 'Withdrawal processed successfully',
  WITHDRAWAL_REJECTED: 'Withdrawal rejected successfully',
} as const;

export const MINIMUM_WITHDRAWAL = 10;
export const WITHDRAWAL_FEE_PERCENTAGE = 0.15; // 15%
export const PRINCIPAL_PENALTY_PERCENTAGE = 0.40; // 40%
