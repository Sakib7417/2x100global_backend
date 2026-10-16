/// <reference types="jest" />
import { cycleBonusService } from '../modules/cycleBonus/service/cycleBonus.service';
import { cycleBonusRepository } from '../modules/cycleBonus/repository/cycleBonus.repository';
import { rankService } from '../modules/rank/service/rank.service';
import { walletService } from '../modules/wallet/service/wallet.service';
import { ledgerService } from '../modules/ledger/service/ledger.service';
import prisma from '../config/database';
import { RankLevel, WalletType } from '@prisma/client';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    rank: { findMany: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../modules/cycleBonus/repository/cycleBonus.repository', () => ({
  cycleBonusRepository: {
    findLatestByUserId: jest.fn(),
    create: jest.fn(),
    markAsCredited: jest.fn(),
  },
}));

jest.mock('../modules/rank/service/rank.service', () => ({
  rankService: { computeNetworkEligibility: jest.fn() },
}));

jest.mock('../modules/wallet/service/wallet.service', () => ({
  walletService: { creditWallet: jest.fn() },
}));

jest.mock('../modules/ledger/service/ledger.service', () => ({
  ledgerService: { createEntry: jest.fn() },
}));

const mockedPrisma = prisma as jest.Mocked<any>;
const creditWallet = walletService.creditWallet as jest.Mock;
const findLatest = cycleBonusRepository.findLatestByUserId as jest.Mock;
const createCycle = cycleBonusRepository.create as jest.Mock;
const markCredited = cycleBonusRepository.markAsCredited as jest.Mock;
const eligibilityMock = rankService.computeNetworkEligibility as jest.Mock;

const rankRow = (userId: string, level: RankLevel) => ({
  id: `rank-${userId}`,
  userId,
  level,
  totalRankBonusEarned: 100,
  directReferrals: 5,
  teamSize: 10,
  user: { id: userId },
});

const info = (eligible: boolean) => ({
  eligible,
  teamSize: 10,
  qualifyingDirects: 5,
  descEligible: [5, 0, 0, 0, 0, 0, 0],
});

describe('CycleBonusService.process10DayCycleBonus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    creditWallet.mockResolvedValue({
      wallet: { id: 'wallet-1' },
      beforeBalance: 0,
      afterBalance: 10,
    });
    findLatest.mockResolvedValue(null);
    createCycle.mockResolvedValue({ id: 'cycle-1' });
    markCredited.mockImplementation((id: string) => Promise.resolve({ id }));
  });

  it('pays the salary bonus while all rank conditions still hold', async () => {
    mockedPrisma.rank.findMany.mockResolvedValue([rankRow('u1', RankLevel.LV1)]);
    eligibilityMock.mockResolvedValue(new Map([['u1', info(true)]]));

    const result = await cycleBonusService.process10DayCycleBonus();

    expect(result.processedCount).toBe(1);
    expect(creditWallet).toHaveBeenCalledWith('u1', WalletType.POOL_BONUS, 10);
  });

  it('skips a ranked user whose conditions broke (e.g. withdrew principal)', async () => {
    mockedPrisma.rank.findMany.mockResolvedValue([rankRow('u1', RankLevel.LV1)]);
    eligibilityMock.mockResolvedValue(new Map([['u1', info(false)]]));

    const result = await cycleBonusService.process10DayCycleBonus();

    expect(result.processedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(creditWallet).not.toHaveBeenCalled();
  });

  it('skips the upline when a downline achiever became ineligible', async () => {
    // LV1 member stays eligible, LV3 upline loses the achiever count
    mockedPrisma.rank.findMany.mockResolvedValue([
      rankRow('member', RankLevel.LV1),
      rankRow('upline', RankLevel.LV3),
    ]);
    eligibilityMock.mockResolvedValue(
      new Map([
        ['member', info(true)],
        ['upline', info(false)],
      ]),
    );

    const result = await cycleBonusService.process10DayCycleBonus();

    expect(result.processedCount).toBe(1);
    expect(creditWallet).toHaveBeenCalledWith('member', WalletType.POOL_BONUS, 10);
    expect(creditWallet).not.toHaveBeenCalledWith('upline', expect.anything(), expect.anything());
  });
});
