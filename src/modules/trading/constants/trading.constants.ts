export const TRADING_ERRORS = {
  TRADE_NOT_FOUND: 'Trade not found',
  INSUFFICIENT_BALANCE: 'Insufficient principal balance',
  INVALID_AMOUNT: 'Invalid trade amount',
  INVALID_LEVERAGE: 'Invalid leverage',
  INVALID_ENTRY_PRICE: 'Invalid entry price',
  TRADE_ALREADY_COMPLETED: 'Trade already completed',
  CANNOT_COMPLETE_ACTIVE: 'Cannot complete active trade',
  AUTO_TRADING_DISABLED: 'Auto trading is disabled',
  INVALID_TRADE_TYPE: 'Invalid trade type',
} as const;

export const TRADING_SUCCESS = {
  TRADE_CREATED: 'Trade created successfully',
  TRADE_COMPLETED: 'Trade completed successfully',
  AUTO_TRADING_ENABLED: 'Auto trading enabled successfully',
  AUTO_TRADING_DISABLED: 'Auto trading disabled successfully',
} as const;

export const MIN_TRADE_AMOUNT = 10;
export const MAX_LEVERAGE = 100;
export const DEFAULT_LEVERAGE = 10;
export const AUTO_TRADING_PROFIT_PERCENTAGE = 0.02; // 2%
export const AUTO_TRADING_LOSS_PERCENTAGE = 0.01; // 1%

export const NORMAL_TRADE_PROFIT_RATE = 0.8333; // 83.33% return on trade amount (100-day 2x with 2 trades/day)
export const SPONSOR_TRADE_BONUS_RATE = 1.6666; // 166.66% return on trade amount (2x normal rate)
export const SPONSOR_TRADE_BONUS_DEPOSIT_MIN = 1000; // Minimum deposit to trigger bonus
export const SPONSOR_TRADE_BONUS_DURATION_DAYS = 3; // Bonus validity in days

// Manual code-based trading
export const TRADE_CODE_LENGTH = 8;
export const TRADE_CODE_VALIDITY_MINUTES = 15;

// Trade plan: 100 days × 2 sessions/day = 200 trades. Completing 70% of the
// plan (140 trades) waives the early-exit penalty on Principal withdrawals.
export const TOTAL_PLAN_TRADES = 200;
export const PENALTY_FREE_TRADE_RATIO = 0.70;
