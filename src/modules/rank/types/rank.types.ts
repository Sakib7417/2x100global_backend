import { RankLevel } from '@prisma/client';

export interface RankStatusDTO {
  currentRank: RankLevel;
  directReferralCount: number;
  qualifyingDirectDepositCount: number;
  /** Downline-wide count of members at LV1 or above (any depth). */
  lv1AchieverCount: number;
  teamSize: number;
  achievedAt?: Date;
  nextRank?: {
    level: RankLevel;
    requirements: string[];
  };
}

/**
 * One user inside a referral subtree (or the whole network) as needed for
 * live eligibility checks: rank, sponsor link and current PRINCIPAL balance.
 */
export interface RankNetworkNode {
  id: string;
  sponsorId: string | null;
  rank: RankLevel;
  principal: number;
}

/**
 * Computed per-user view used for both promotion checks and the cycle
 * (salary) bonus gate.
 *
 * - `eligible`: the user's CURRENT rank conditions still hold right now —
 *   own principal >= the self-activation minimum AND every requirement of
 *   their stored rank is met by members who are themselves still eligible.
 *   A member who withdrew their principal stops counting everywhere, which
 *   cascades upward: their upline loses the achiever count and becomes
 *   ineligible too.
 * - `descEligible[t]`: eligible descendants whose tier index >= t
 *   (t = 0 means LV1+, 1 means LV2+, ...). Eligible members only.
 */
export interface EligibilityInfo {
  eligible: boolean;
  teamSize: number;
  qualifyingDirects: number;
  descEligible: number[];
}
