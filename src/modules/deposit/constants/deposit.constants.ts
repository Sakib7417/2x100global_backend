export const DEPOSIT_ERRORS = {
  DEPOSIT_NOT_FOUND: 'Deposit not found',
  INVALID_AMOUNT: 'Invalid deposit amount',
  MINIMUM_DEPOSIT: `Minimum deposit is 100 USDT`,
  INVALID_PACKAGE: `Invalid deposit package. Allowed packages: 100, 300, 500, 1000, 2000, 5000, 10000 USDT`,
  INVALID_TRANSACTION_HASH: 'Invalid transaction hash',
  DUPLICATE_TRANSACTION: 'Duplicate transaction hash',
  VERIFICATION_FAILED: 'Deposit verification failed',
  ALREADY_VERIFIED: 'Deposit already verified',
  ALREADY_APPROVED: 'Deposit already approved',
  CANNOT_APPROVE_PENDING: 'Cannot approve rejected or already approved deposit',
  INVALID_STATUS: 'Invalid deposit status',
} as const;

export const DEPOSIT_SUCCESS = {
  DEPOSIT_CREATED: 'Deposit created successfully',
  DEPOSIT_VERIFIED: 'Deposit verified successfully',
  DEPOSIT_APPROVED: 'Deposit approved successfully',
  DEPOSIT_REJECTED: 'Deposit rejected successfully',
} as const;

export const MINIMUM_DEPOSIT = 100;

// Fixed deposit packages — users can only deposit one of these amounts
export const ALLOWED_DEPOSIT_AMOUNTS = [100, 300, 500, 1000, 2000, 5000, 10000] as const;
export const FEE_TOLERANCE_USD = 0.1; // Allow up to $0.10 shortfall due to token fees/slippage

// Flat deposit bonus — 5% on all deposit amounts
export const DEPOSIT_BONUS_RATE = 0.05;
