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

export const REFERRAL_BONUS_TIERS = {
  TIER_1_MIN: 50,
  TIER_1_MAX: 999,
  TIER_1_PERCENT: 0.05, // 5%
  TIER_2_MIN: 1000,
  TIER_2_PERCENT: 0.10, // 10%
};
