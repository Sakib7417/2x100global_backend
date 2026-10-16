/// <reference types="jest" />
import { walletService } from '../modules/wallet/service/wallet.service';
import { walletRepository } from '../modules/wallet/repository/wallet.repository';
import { ledgerService } from '../modules/ledger/service/ledger.service';
import prisma from '../config/database';
import { WalletType, LedgerType } from '@prisma/client';

const mockWallet: any = {
  id: 'wallet-id',
  userId: 'user-id',
  type: WalletType.PRINCIPAL,
  balance: 1000,
  totalCredit: 1000,
  totalDebit: 0,
};

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    trade: { count: jest.fn() },
    user: { update: jest.fn() },
  },
}));

jest.mock('../modules/wallet/repository/wallet.repository', () => ({
  walletRepository: {
    findByUserId: jest.fn(),
    findByUserIdAndType: jest.fn(),
    findById: jest.fn(),
    creditWallet: jest.fn(),
    debitWallet: jest.fn(),
  },
}));

jest.mock('../modules/ledger/service/ledger.service', () => ({
  ledgerService: {
    createEntry: jest.fn(),
  },
}));

const mockedPrisma = prisma as jest.Mocked<any>;
const findByType = walletRepository.findByUserIdAndType as jest.Mock;
const createEntry = ledgerService.createEntry as jest.Mock;

describe('WalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get wallet summary for a user', async () => {
    (walletRepository.findByUserId as jest.Mock).mockResolvedValue([mockWallet]);

    const summary = await walletService.getWalletSummary('user-id');
    expect(summary).toHaveProperty('principal');
    expect(summary.principal.balance).toBe('1000');
    expect(summary).toHaveProperty('totalBalance');
  });

  it('should credit wallet and create ledger data', async () => {
    findByType.mockResolvedValue(mockWallet);
    (walletRepository.creditWallet as jest.Mock).mockResolvedValue({ ...mockWallet, balance: 1050, totalCredit: 1050 });

    const result = await walletService.creditWallet('user-id', WalletType.PRINCIPAL, 50);
    expect(result.afterBalance).toBe(1050);
  });

  describe('resetTradeCountBaseline', () => {
    it('records the current completed-trade count on the user', async () => {
      mockedPrisma.trade.count.mockResolvedValue(42);
      mockedPrisma.user.update.mockResolvedValue({});

      const baseline = await walletService.resetTradeCountBaseline('user-id');

      expect(baseline).toBe(42);
      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { tradeCountBaseline: 42 },
      });
    });
  });

  describe('transferToPrincipal', () => {
    const referralWallet = { id: 'w-ref', userId: 'user-id', type: WalletType.REFERRAL, balance: 500, totalCredit: 500, totalDebit: 0 };
    const principalWallet = { id: 'w-prin', userId: 'user-id', type: WalletType.PRINCIPAL, balance: 300, totalCredit: 300, totalDebit: 0 };

    const setupTransfer = () => {
      findByType.mockImplementation((_uid: string, type: WalletType) =>
        Promise.resolve(type === WalletType.REFERRAL ? referralWallet : principalWallet));
      (walletRepository.debitWallet as jest.Mock).mockResolvedValue(
        { ...referralWallet, balance: 400, totalDebit: 100 });
      (walletRepository.creditWallet as jest.Mock).mockResolvedValue(
        { ...principalWallet, balance: 400, totalCredit: 400 });
      mockedPrisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      mockedPrisma.trade.count.mockResolvedValue(37);
      mockedPrisma.user.update.mockResolvedValue({});
    };

    it('moves balance atomically and restarts the trade counter', async () => {
      setupTransfer();

      const result = await walletService.transferToPrincipal(
        'user-id', WalletType.REFERRAL, 100,
      );

      expect(result.principalBalance).toBe(400);
      expect(result.tradeCountBaseline).toBe(37);
      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { tradeCountBaseline: 37 },
      });
      // paired COMPOUND_TRANSFER entries on both wallets
      expect(createEntry).toHaveBeenCalledTimes(2);
      expect(createEntry.mock.calls[0][0]).toMatchObject({
        type: LedgerType.COMPOUND_TRANSFER,
        debit: 100,
        walletId: 'w-ref',
      });
      expect(createEntry.mock.calls[1][0]).toMatchObject({
        type: LedgerType.COMPOUND_TRANSFER,
        credit: 100,
        walletId: 'w-prin',
      });
    });

    it('rejects PRINCIPAL as the source wallet', async () => {
      await expect(
        walletService.transferToPrincipal('user-id', WalletType.PRINCIPAL, 100),
      ).rejects.toThrow('Invalid wallet type');
    });

    it('rejects non-positive amounts', async () => {
      await expect(
        walletService.transferToPrincipal('user-id', WalletType.REFERRAL, 0),
      ).rejects.toThrow('greater than zero');
    });
  });
});
