import { RankLevel } from '@prisma/client';

export interface RankStatusDTO {
  currentRank: RankLevel;
  directReferralCount: number;
  qualifyingDirectDepositCount: number;
  directLv1Count: number;
  teamSize: number;
  achievedAt?: Date;
  nextRank?: {
    level: RankLevel;
    requirements: string[];
  };
}
