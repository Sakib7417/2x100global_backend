/// <reference types="jest" />
import { walletService } from '../modules/wallet/service/wallet.service';
import { walletRepository } from '../modules/wallet/repository/wallet.repository';
import { ledgerService } from '../modules/ledger/service/ledger.service';
import { WalletType } from '@prisma/client';

const mockWallet: any = {
  id: 'wallet-id',
  userId: 'user-id',
  type: WalletType.PRINCIPAL,
  balance: 1000,
  totalCredit: 1000,
  totalDebit: 0,
};

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
    (walletRepository.findByUserIdAndType as jest.Mock).mockResolvedValue(mockWallet);
    (walletRepository.creditWallet as jest.Mock).mockResolvedValue({ ...mockWallet, balance: 1050, totalCredit: 1050 });

    const result = await walletService.creditWallet('user-id', WalletType.PRINCIPAL, 50);
    expect(result.afterBalance).toBe(1050);
  });
});
