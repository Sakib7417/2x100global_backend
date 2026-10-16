/// <reference types="jest" />
import { rankService } from '../modules/rank/service/rank.service';
import { rankRepository } from '../modules/rank/repository/rank.repository';
import { walletRepository } from '../modules/wallet/repository/wallet.repository';
import { walletService } from '../modules/wallet/service/wallet.service';
import { ledgerService } from '../modules/ledger/service/ledger.service';
import {
  RANK_DEFINITIONS,
  RankTier,
} from '../modules/rank/constants/rank.constants';
import { RankNetworkNode } from '../modules/rank/types/rank.types';
import prisma from '../config/database';
import { RankLevel, WalletType } from '@prisma/client';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    rank: { findUnique: jest.fn() },
    rankHistory: { findMany: jest.fn() },
  },
}));

jest.mock('../modules/rank/repository/rank.repository', () => ({
  rankRepository: {
    findByUserId: jest.fn(),
    upsertUserRank: jest.fn(),
    createRankHistory: jest.fn(),
    findHistoryByUserId: jest.fn(),
    getDownlineDetails: jest.fn(),
    getApprovedDepositSums: jest.fn(),
  },
}));

jest.mock('../modules/wallet/service/wallet.service', () => ({
  walletService: {
    creditWallet: jest.fn(),
  },
}));

jest.mock('../modules/wallet/repository/wallet.repository', () => ({
  walletRepository: {
    findByUserIdAndType: jest.fn(),
  },
}));

jest.mock('../modules/ledger/service/ledger.service', () => ({
  ledgerService: {
    createEntry: jest.fn(),
  },
}));

const mockedPrisma = prisma as jest.Mocked<any>;
const creditWallet = walletService.creditWallet as jest.Mock;
const createEntry = ledgerService.createEntry as jest.Mock;
const downlineMock = rankRepository.getDownlineDetails as jest.Mock;
const depositsMock = rankRepository.getApprovedDepositSums as jest.Mock;
const upsertMock = rankRepository.upsertUserRank as jest.Mock;
const historyMock = rankRepository.createRankHistory as jest.Mock;

let seq = 0;
const uid = (prefix: string) => `${prefix}-${seq++}`;

/** Flat unranked members sponsored by `sponsorId` — team-size fillers. */
const fillers = (
  sponsorId: string,
  count: number,
  principal = 300,
): RankNetworkNode[] =>
  Array.from({ length: count }, () => ({
    id: uid('f'),
    sponsorId,
    rank: RankLevel.NONE,
    principal,
  }));

/**
 * Build a subtree whose root is CURRENTLY ELIGIBLE at `rank` — it keeps
 * its own $300 principal stake and its real requirements are constructed
 * recursively (qualifying directs for LV1, eligible achiever subtrees and
 * team size for higher ranks).
 */
const makeEligibleSubtree = (
  sponsorId: string,
  rank: RankTier,
  nodes: RankNetworkNode[],
  deposits: Map<string, number>,
): string => {
  const rootId = uid(rank.toLowerCase());
  const startLen = nodes.length;
  nodes.push({ id: rootId, sponsorId, rank, principal: 300 });
  const def = RANK_DEFINITIONS[rank];
  const subtreeSize = () => nodes.length - startLen - 1;

  if (rank === RankLevel.LV1) {
    for (let i = 0; i < def.qualifyingDirects; i++) {
      const kid = uid('qd');
      nodes.push({ id: kid, sponsorId: rootId, rank: RankLevel.NONE, principal: 300 });
      deposits.set(kid, def.minDirectDeposit);
    }
    return rootId;
  }

  for (let i = 0; i < def.lv1AchieverCount; i++) {
    makeEligibleSubtree(rootId, RankLevel.LV1, nodes, deposits);
  }
  if (def.higherAchieverRank) {
    for (let i = 0; i < (def.higherAchieverCount ?? 0); i++) {
      makeEligibleSubtree(rootId, def.higherAchieverRank, nodes, deposits);
    }
  }
  while (subtreeSize() < def.teamSize) {
    nodes.push({
      id: uid('f'),
      sponsorId: rootId,
      rank: RankLevel.NONE,
      principal: 300,
    });
  }
  return rootId;
};

interface EvalOptions {
  rank?: RankLevel;
  sponsorId?: string | null;
  directs?: number;
  /** Direct referrals of user-1 with deposits >= $300 AND principal >= $300 */
  qualifying?: number;
  downline?: RankNetworkNode[];
  depositSums?: Map<string, number>;
  selfPrincipal?: number;
}

const setupEval = ({
  rank = RankLevel.NONE,
  sponsorId = null,
  directs = 0,
  qualifying = 0,
  downline = [],
  depositSums,
  selfPrincipal = 300,
}: EvalOptions = {}) => {
  const tx = {
    $queryRaw: jest
      .fn()
      .mockResolvedValue([{ id: 'user-1', rank, sponsor_id: sponsorId }]),
    user: {
      count: jest.fn().mockResolvedValue(directs),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const nodes = [...downline];
  const sums = new Map(depositSums ?? []);
  for (let i = 0; i < qualifying; i++) {
    const id = uid('qd');
    nodes.push({ id, sponsorId: 'user-1', rank: RankLevel.NONE, principal: 300 });
    sums.set(id, 300);
  }

  mockedPrisma.$transaction.mockImplementation((cb: any) => cb(tx));
  downlineMock.mockResolvedValue(nodes);
  depositsMock.mockResolvedValue(sums);
  upsertMock.mockResolvedValue({});
  historyMock.mockResolvedValue({});
  (walletRepository.findByUserIdAndType as jest.Mock).mockResolvedValue(
    selfPrincipal > 0 ? { id: 'wallet-1', balance: selfPrincipal } : null,
  );

  return tx;
};

describe('RankService.evaluateUserRank', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seq = 0;
    creditWallet.mockImplementation((userId: string, type: WalletType, amount: number) =>
      Promise.resolve({ wallet: { id: 'wallet-1' }, beforeBalance: 0, afterBalance: amount }),
    );
  });

  it('does not award LV1 with only 4 qualifying direct referrals', async () => {
    setupEval({ qualifying: 4, directs: 4 });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.NONE);
    expect(creditWallet).not.toHaveBeenCalled();
    expect(historyMock).not.toHaveBeenCalled();
  });

  it('awards LV1 once 5 directs reach $300 cumulative approved deposits', async () => {
    const tx = setupEval({ qualifying: 5, directs: 6 });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV1);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { rank: RankLevel.LV1 },
    });
    expect(creditWallet).toHaveBeenCalledWith('user-1', WalletType.RANK_BONUS, 100, tx);
    expect(createEntry).toHaveBeenCalledTimes(1);
    expect(historyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        previousLevel: RankLevel.NONE,
        newLevel: RankLevel.LV1,
      }),
      tx,
    );
  });

  it('blocks LV1 when a qualifying direct withdrew their principal', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    // 4 directs fully qualifying, 1 direct deposited $300 but withdrew
    for (let i = 0; i < 4; i++) {
      const id = uid('qd');
      nodes.push({ id, sponsorId: 'user-1', rank: RankLevel.NONE, principal: 300 });
      deposits.set(id, 300);
    }
    const withdrawn = uid('qd-w');
    nodes.push({ id: withdrawn, sponsorId: 'user-1', rank: RankLevel.NONE, principal: 0 });
    deposits.set(withdrawn, 300);

    setupEval({ downline: nodes, depositSums: deposits, directs: 5 });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.NONE);
    expect(creditWallet).not.toHaveBeenCalled();
  });

  it('counts LV1 achievers anywhere in the downline, not only directs', async () => {
    // Two currently-eligible LV1 achievers + fillers => LV2
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    const m1 = makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    // second achiever sits deeper in the tree (any depth counts)
    makeEligibleSubtree(`${m1}-deep`, RankLevel.LV1, nodes, deposits);
    nodes.push({ id: `${m1}-deep`, sponsorId: m1, rank: RankLevel.NONE, principal: 300 });
    nodes.push(...fillers('user-1', 13));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV2);
    expect(creditWallet).toHaveBeenCalledWith('user-1', WalletType.RANK_BONUS, 200, expect.anything());
  });

  it('requires BOTH 2 LV1 achievers and 25 team members for LV2', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    nodes.push(...fillers('user-1', 12)); // team = 24

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.NONE);
    expect(creditWallet).not.toHaveBeenCalled();
  });

  it('requires 3 LV1 achievers and 125 team members for LV3', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 3; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 125 - nodes.length));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV3);
  });

  it('falls back to the highest eligible tier when LV3 team size is short', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 3; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 124 - nodes.length));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV2);
  });

  it('awards LV4 only with 4 LV1 achievers, 2 LV2 achievers and 500 team', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 2; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV2, nodes, deposits);
    }
    for (let i = 0; i < 2; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 500 - nodes.length));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV4);
  });

  it('blocks LV4 when the LV2-achiever requirement is missing', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 4; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 500 - nodes.length));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV3);
  });

  it('awards LV5 with 5 LV1+ achievers, 2 LV3+ achievers and 1000 team', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 2; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV3, nodes, deposits);
    }
    for (let i = 0; i < 3; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 1000 - nodes.length));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV5);
  });

  it('awards LV6 with 6 LV1+ achievers, 2 LV4+ achievers and 2000 team', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 2; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV4, nodes, deposits);
    }
    for (let i = 0; i < 4; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 2000 - nodes.length));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV6);
  });

  it('awards LV7 with 7 LV1+ achievers, 2 LV6+ achievers and 5000 team', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 2; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV6, nodes, deposits);
    }
    for (let i = 0; i < 5; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 5000 - nodes.length));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV7);
  });

  it('lets higher-ranked members count toward lower achiever thresholds', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 2; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV3, nodes, deposits);
    }
    // each LV3 subtree already has 125+ members; team well above 25
    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV3); // 2 eligible LV3s => LV1+ count 2+2*3 >= 3
  });

  it('stops counting an achiever who withdrew their principal stake', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    const withdrawn = makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    nodes.find((n) => n.id === withdrawn)!.principal = 0; // pulled the $300 out
    nodes.push(...fillers('user-1', 13));

    setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    // Only 1 eligible LV1 remains => LV2 fails, user stays NONE
    expect(rank).toBe(RankLevel.NONE);
    expect(creditWallet).not.toHaveBeenCalled();
  });

  it('records every intermediate rank and bonus on a multi-level jump', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 3; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 125 - nodes.length));
    const tx = setupEval({ downline: nodes, depositSums: deposits });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV3);
    // NONE -> LV1 -> LV2 -> LV3: three upgrades, three bonuses, three history rows
    expect(creditWallet).toHaveBeenCalledTimes(3);
    expect(creditWallet.mock.calls.map((c) => c[2])).toEqual([100, 200, 300]);
    expect(historyMock).toHaveBeenCalledTimes(3);
    expect(historyMock.mock.calls[0][0]).toMatchObject({
      previousLevel: RankLevel.NONE,
      newLevel: RankLevel.LV1,
    });
    expect(historyMock.mock.calls[2][0]).toMatchObject({
      previousLevel: RankLevel.LV2,
      newLevel: RankLevel.LV3,
    });
    expect(tx.user.update).toHaveBeenCalledTimes(3);
  });

  it('blocks every rank when self PRINCIPAL balance is below $300', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 3; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 125 - nodes.length));
    setupEval({ downline: nodes, depositSums: deposits, selfPrincipal: 299 });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.NONE);
    expect(creditWallet).not.toHaveBeenCalled();
  });

  it('requires self PRINCIPAL >= $300 even for higher tiers', async () => {
    const nodes: RankNetworkNode[] = [];
    const deposits = new Map<string, number>();
    for (let i = 0; i < 2; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV4, nodes, deposits);
    }
    for (let i = 0; i < 4; i++) {
      makeEligibleSubtree('user-1', RankLevel.LV1, nodes, deposits);
    }
    nodes.push(...fillers('user-1', 2000 - nodes.length));
    setupEval({
      rank: RankLevel.LV3,
      downline: nodes,
      depositSums: deposits,
      selfPrincipal: 50,
    });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV3);
    expect(creditWallet).not.toHaveBeenCalled();
  });

  it('never downgrades when conditions later drop', async () => {
    setupEval({ rank: RankLevel.LV3, qualifying: 0, downline: [] });

    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV3);
    expect(creditWallet).not.toHaveBeenCalled();
  });

  it('does not duplicate bonuses when stake is withdrawn and restored', async () => {
    // Achieve LV1, withdraw (rank stays), re-deposit => eligible again but
    // NO second achievement bonus and no new history row
    setupEval({ qualifying: 5 });
    await rankService.evaluateUserRank('user-1');
    expect(creditWallet).toHaveBeenCalledTimes(1);

    setupEval({ rank: RankLevel.LV1, qualifying: 5 });
    const rank = await rankService.evaluateUserRank('user-1');

    expect(rank).toBe(RankLevel.LV1);
    expect(creditWallet).toHaveBeenCalledTimes(1);
    expect(historyMock).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent evaluations via row lock re-read', async () => {
    setupEval({ qualifying: 5 });
    const first = rankService.evaluateUserRank('user-1');
    setupEval({ rank: RankLevel.LV1, qualifying: 5 });
    const second = rankService.evaluateUserRank('user-1');

    const [r1, r2] = await Promise.all([first, second]);

    expect([r1, r2]).toEqual([RankLevel.LV1, RankLevel.LV1]);
    expect(creditWallet).toHaveBeenCalledTimes(1);
  });

  it('re-evaluates the sponsor only when a promotion happened', async () => {
    const evalSpy = jest.spyOn(rankService, 'evaluateUserRank');
    setupEval({ sponsorId: 'sponsor-1', qualifying: 5 });
    await rankService.evaluateUserRank('user-1');

    expect(evalSpy).toHaveBeenCalledWith('sponsor-1');

    jest.clearAllMocks();
    setupEval({ sponsorId: 'sponsor-1', qualifying: 0 });
    await rankService.evaluateUserRank('user-1');
    expect(evalSpy).toHaveBeenCalledTimes(1); // only the direct call, no sponsor call
    evalSpy.mockRestore();
  });
});
