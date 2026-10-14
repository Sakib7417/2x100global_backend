export const POOL_BONUS_ERRORS = {
  POOL_BONUS_NOT_FOUND: 'Cycle bonus not found',
  INSUFFICIENT_VOLUME: 'Insufficient trading volume',
  CYCLE_NOT_ENDED: 'Cycle has not ended yet',
  BONUS_ALREADY_PROCESSED: 'Bonus already processed',
  INVALID_CYCLE: 'Invalid cycle',
} as const;

export const POOL_BONUS_SUCCESS = {
  POOL_BONUS_PROCESSED: 'Cycle bonus processed successfully',
  POOL_BONUS_CREATED: 'Cycle bonus created successfully',
} as const;

export const CYCLE_DURATION_DAYS = 30;
export const MIN_VOLUME = 1000;
export const BONUS_PERCENTAGE = 0.05; // 5%
export const MAX_BONUS = 10000;
