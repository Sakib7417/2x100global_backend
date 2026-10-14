import { ledgerRepository } from '../repository/ledger.repository';
import { LEDGER_ERRORS } from '../constants/ledger.constants';
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from '../../../utils/errors';
import { CreateLedgerDTO, LedgerQueryDTO } from '../types/ledger.types';

export class LedgerService {
  /**
   * Create ledger entry
   */
  async createEntry(data: CreateLedgerDTO): Promise<any> {
    // Validate balance calculation
    const calculatedAfterBalance = data.beforeBalance + data.credit - data.debit;
    if (Math.abs(calculatedAfterBalance - data.afterBalance) > 0.0001) {
      throw new InternalError(LEDGER_ERRORS.INVALID_BALANCE);
    }

    // Validate amounts
    if (data.credit < 0 || data.debit < 0) {
      throw new BadRequestError(LEDGER_ERRORS.INVALID_AMOUNT);
    }

    // Both credit and debit cannot be positive
    if (data.credit > 0 && data.debit > 0) {
      throw new BadRequestError(LEDGER_ERRORS.INVALID_AMOUNT);
    }

    return ledgerRepository.create({
      userId: data.userId,
      walletId: data.walletId,
      type: data.type,
      credit: data.credit,
      debit: data.debit,
      beforeBalance: data.beforeBalance,
      afterBalance: data.afterBalance,
      description: data.description,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
      metadata: data.metadata,
    });
  }

  /**
   * Get ledger entries for user
   */
  async getUserLedgers(userId: string, query: LedgerQueryDTO) {
    const options = {
      type: query.type,
      walletId: query.walletId,
      referenceId: query.referenceId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    };

    return ledgerRepository.findByUserId(userId, options);
  }

  /**
   * Get ledger entries for wallet
   */
  async getWalletLedgers(walletId: string, query: LedgerQueryDTO) {
    const options = {
      type: query.type,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    };

    return ledgerRepository.findByWalletId(walletId, options);
  }

  /**
   * Get ledger by ID
   */
  async getLedgerById(id: string) {
    const ledger = await ledgerRepository.findById(id);
    if (!ledger) {
      throw new NotFoundError(LEDGER_ERRORS.LEDGER_NOT_FOUND);
    }
    return ledger;
  }

  /**
   * Get ledger by reference ID
   */
  async getLedgersByReference(referenceId: string) {
    return ledgerRepository.findByReferenceId(referenceId);
  }

  /**
   * Calculate wallet balance from ledger
   */
  async calculateWalletBalance(walletId: string) {
    return ledgerRepository.calculateBalance(walletId);
  }

  /**
   * Generate unique reference ID
   */
  generateReferenceId(): string {
    return `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const ledgerService = new LedgerService();
