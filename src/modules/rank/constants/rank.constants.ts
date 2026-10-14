import { RankLevel } from '@prisma/client';

export interface RankDefinition {
  level: RankLevel;
  name: string;
  directReferralCount: number;
  minDirectDeposit: number;
  directLv1Count: number;
  teamSize: number;
  rankBonus: number;
  cycleBonus: number;
}

export const RANK_DEFINITIONS: Record<RankLevel, RankDefinition> = {
  [RankLevel.LV1]: {
    level: RankLevel.LV1,
    name: 'Level 1',
    directReferralCount: 5,
    minDirectDeposit: 300,
    directLv1Count: 0,
    teamSize: 0,
    rankBonus: 100,
    cycleBonus: 10,
  },
  [RankLevel.LV2]: {
    level: RankLevel.LV2,
    name: 'Level 2',
    directReferralCount: 0,
    minDirectDeposit: 0,
    directLv1Count: 2,
    teamSize: 25,
    rankBonus: 200,
    cycleBonus: 20,
  },
  [RankLevel.LV3]: {
    level: RankLevel.LV3,
    name: 'Level 3',
    directReferralCount: 0,
    minDirectDeposit: 0,
    directLv1Count: 3,
    teamSize: 125,
    rankBonus: 300,
    cycleBonus: 50,
  },
  [RankLevel.LV4]: {
    level: RankLevel.LV4,
    name: 'Level 4',
    directReferralCount: 0,
    minDirectDeposit: 0,
    directLv1Count: 4,
    teamSize: 500,
    rankBonus: 500,
    cycleBonus: 150,
  },
  [RankLevel.LV5]: {
    level: RankLevel.LV5,
    name: 'Level 5',
    directReferralCount: 0,
    minDirectDeposit: 0,
    directLv1Count: 5,
    teamSize: 1000,
    rankBonus: 1000,
    cycleBonus: 500,
  },
  [RankLevel.LV6]: {
    level: RankLevel.LV6,
    name: 'Level 6',
    directReferralCount: 0,
    minDirectDeposit: 0,
    directLv1Count: 6,
    teamSize: 2000,
    rankBonus: 2500,
    cycleBonus: 1500,
  },
  [RankLevel.LV7]: {
    level: RankLevel.LV7,
    name: 'Level 7',
    directReferralCount: 0,
    minDirectDeposit: 0,
    directLv1Count: 7,
    teamSize: 5000,
    rankBonus: 10000,
    cycleBonus: 3000,
  },
};

export const RANK_ORDER: RankLevel[] = [
  RankLevel.LV1,
  RankLevel.LV2,
  RankLevel.LV3,
  RankLevel.LV4,
  RankLevel.LV5,
  RankLevel.LV6,
  RankLevel.LV7,
];
