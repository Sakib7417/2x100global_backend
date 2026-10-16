import { RankLevel } from '@prisma/client';

/**
 * Rank qualification rules.
 *
 * - `qualifyingDirects` / `minDirectDeposit`: LV1 only — the user needs this many
 *   DIRECT referrals whose cumulative APPROVED deposits reach `minDirectDeposit`.
 * - `lv1AchieverCount`: number of members anywhere in the user's downline whose
 *   rank is LV1 or higher (LV2+ requirements).
 * - `higherAchieverRank` / `higherAchieverCount`: LV4+ additionally need this many
 *   downline members at `higherAchieverRank` or above.
 * - `teamSize`: minimum total downline members at every depth (user excluded).
 *
 * Overlap rule: a member counts toward EVERY achiever category they satisfy —
 * e.g. an LV3 downline member counts toward both the LV1-achiever and the
 * LV2-achiever requirements, but is never counted twice within one category.
 */
export interface RankDefinition {
  level: RankTier;
  name: string;
  qualifyingDirects: number;
  minDirectDeposit: number;
  lv1AchieverCount: number;
  higherAchieverRank?: RankTier;
  higherAchieverCount?: number;
  teamSize: number;
  rankBonus: number;
  cycleBonus: number;
}

/** Rank levels that can be earned (excludes the NONE base state). */
export type RankTier = Exclude<RankLevel, 'NONE'>;

/**
 * Self-activation gate — every rank additionally requires the user's OWN
 * PRINCIPAL wallet balance to be at least this amount.
 */
export const MIN_SELF_PRINCIPAL_FOR_RANK = 300;

export const RANK_DEFINITIONS: Record<RankTier, RankDefinition> = {
  [RankLevel.LV1]: {
    level: RankLevel.LV1,
    name: 'Level 1',
    qualifyingDirects: 5,
    minDirectDeposit: 300,
    lv1AchieverCount: 0,
    teamSize: 0,
    rankBonus: 100,
    cycleBonus: 10,
  },
  [RankLevel.LV2]: {
    level: RankLevel.LV2,
    name: 'Level 2',
    qualifyingDirects: 0,
    minDirectDeposit: 0,
    lv1AchieverCount: 2,
    teamSize: 25,
    rankBonus: 200,
    cycleBonus: 20,
  },
  [RankLevel.LV3]: {
    level: RankLevel.LV3,
    name: 'Level 3',
    qualifyingDirects: 0,
    minDirectDeposit: 0,
    lv1AchieverCount: 3,
    teamSize: 125,
    rankBonus: 300,
    cycleBonus: 50,
  },
  [RankLevel.LV4]: {
    level: RankLevel.LV4,
    name: 'Level 4',
    qualifyingDirects: 0,
    minDirectDeposit: 0,
    lv1AchieverCount: 4,
    higherAchieverRank: RankLevel.LV2,
    higherAchieverCount: 2,
    teamSize: 500,
    rankBonus: 500,
    cycleBonus: 150,
  },
  [RankLevel.LV5]: {
    level: RankLevel.LV5,
    name: 'Level 5',
    qualifyingDirects: 0,
    minDirectDeposit: 0,
    lv1AchieverCount: 5,
    higherAchieverRank: RankLevel.LV3,
    higherAchieverCount: 2,
    teamSize: 1000,
    rankBonus: 1000,
    cycleBonus: 500,
  },
  [RankLevel.LV6]: {
    level: RankLevel.LV6,
    name: 'Level 6',
    qualifyingDirects: 0,
    minDirectDeposit: 0,
    lv1AchieverCount: 6,
    higherAchieverRank: RankLevel.LV4,
    higherAchieverCount: 2,
    teamSize: 2000,
    rankBonus: 2500,
    cycleBonus: 1500,
  },
  [RankLevel.LV7]: {
    level: RankLevel.LV7,
    name: 'Level 7',
    qualifyingDirects: 0,
    minDirectDeposit: 0,
    lv1AchieverCount: 7,
    higherAchieverRank: RankLevel.LV6,
    higherAchieverCount: 2,
    teamSize: 5000,
    rankBonus: 10000,
    cycleBonus: 3000,
  },
};

export const RANK_ORDER: RankTier[] = [
  RankLevel.LV1,
  RankLevel.LV2,
  RankLevel.LV3,
  RankLevel.LV4,
  RankLevel.LV5,
  RankLevel.LV6,
  RankLevel.LV7,
];
