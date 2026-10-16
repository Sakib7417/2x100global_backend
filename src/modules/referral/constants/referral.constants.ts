export const REFERRAL_ERRORS = {
  REFERRAL_NOT_FOUND: 'Referral not found',
  INVALID_REFERRAL_CODE: 'Invalid referral code',
  SELF_REFERRAL: 'Cannot refer yourself',
  ALREADY_REFERRED: 'Already referred by someone',
  BONUS_ALREADY_PAID: 'Bonus already paid',
  INVALID_AMOUNT: 'Invalid bonus amount',
} as const;

export const REFERRAL_SUCCESS = {
  REFERRAL_CREATED: 'Referral created successfully',
  BONUS_PROCESSED: 'Referral bonus processed successfully',
  TREE_RETRIEVED: 'Referral tree retrieved successfully',
} as const;

// Tiered referral bonus — first matching tier wins:
//   ≤300 USDT → 5%, ≤1000 → 8%, >1000 → 10% (no upper cap)
export const REFERRAL_BONUS_TIERS = [
  { maxAmount: 300, percentage: 0.05 },
  { maxAmount: 1000, percentage: 0.08 },
  { maxAmount: Infinity, percentage: 0.10 },
] as const;
