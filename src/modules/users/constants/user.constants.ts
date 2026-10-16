export const USER_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  USER_NOT_ACTIVE: 'User account is not active',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_STATUS: 'Invalid user status',
  UNAUTHORIZED: 'Unauthorized access',
  WITHDRAW_PASSWORD_NOT_SET: 'Withdraw password is not set. Please set it in your profile before withdrawing.',
  WITHDRAW_PASSWORD_INVALID: 'Invalid withdraw password',
  WITHDRAWAL_LOCKED_PREFIX: 'Withdrawals are locked until',
  INVALID_OTP: 'Invalid or expired verification code',
} as const;

// After the withdraw password is set or changed, withdrawals stay locked
// for this many hours.
export const WITHDRAW_PASSWORD_LOCK_HOURS = 24;
