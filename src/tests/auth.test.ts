/// <reference types="jest" />
import { authService } from '../modules/auth/service/auth.service';
import { authRepository } from '../modules/auth/repository/auth.repository';
import { walletRepository } from '../modules/wallet/repository/wallet.repository';
import { prisma } from '../prisma/client';

jest.mock('../modules/auth/repository/auth.repository', () => ({
  authRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    findByReferralCode: jest.fn(),
    createRefreshToken: jest.fn(),
    updateLastLogin: jest.fn(),
  },
}));

jest.mock('../modules/wallet/repository/wallet.repository', () => ({
  walletRepository: {
    createAllWallets: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const hash = await authService.hashPassword('Password123!');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const hash = await authService.hashPassword('Password123!');
      const result = await authService.comparePassword('Password123!', hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await authService.hashPassword('Password123!');
      const result = await authService.comparePassword('WrongPassword', hash);
      expect(result).toBe(false);
    });
  });
});
