/// <reference types="jest" />
import { rankRepository } from '../modules/rank/repository/rank.repository';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: { findMany: jest.fn() },
    deposit: { aggregate: jest.fn() },
  },
}));

const userFindMany = prisma.user.findMany as jest.Mock;
const depositAggregate = prisma.deposit.aggregate as jest.Mock;

describe('RankRepository.countQualifyingDirectReferrals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 when the user has no direct referrals', async () => {
    userFindMany.mockResolvedValue([]);

    const count = await rankRepository.countQualifyingDirectReferrals('user-1', 300);

    expect(count).toBe(0);
    expect(depositAggregate).not.toHaveBeenCalled();
  });

  it('only counts direct referrals of the given user', async () => {
    userFindMany.mockResolvedValue([{ id: 'ref-1' }]);
    depositAggregate.mockResolvedValue({ _sum: { amount: 500 } });

    await rankRepository.countQualifyingDirectReferrals('user-1', 300);

    expect(userFindMany).toHaveBeenCalledWith({
      where: { sponsorId: 'user-1' },
      select: { id: true },
    });
  });

  it('counts a referral whose cumulative approved deposits reach $300 (e.g. 3x$100)', async () => {
    userFindMany.mockResolvedValue([{ id: 'ref-1' }]);
    // Aggregate represents the sum of all APPROVED deposits — three $100
    // deposits qualify the same way as one $300 deposit
    depositAggregate.mockResolvedValue({ _sum: { amount: 300 } });

    const count = await rankRepository.countQualifyingDirectReferrals('user-1', 300);

    expect(count).toBe(1);
  });

  it('does not count a referral below the $300 cumulative threshold', async () => {
    userFindMany.mockResolvedValue([{ id: 'ref-1' }, { id: 'ref-2' }]);
    depositAggregate
      .mockResolvedValueOnce({ _sum: { amount: 299 } })
      .mockResolvedValueOnce({ _sum: { amount: 1000 } });

    const count = await rankRepository.countQualifyingDirectReferrals('user-1', 300);

    expect(count).toBe(1);
  });

  it('aggregates only APPROVED deposits (pending/rejected/failed excluded)', async () => {
    userFindMany.mockResolvedValue([{ id: 'ref-1' }]);
    depositAggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const count = await rankRepository.countQualifyingDirectReferrals('user-1', 300);

    expect(count).toBe(0);
    expect(depositAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'ref-1', status: 'APPROVED' },
        _sum: { amount: true },
      }),
    );
  });
});
