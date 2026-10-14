import { poolBonusRepository } from '../repository/poolBonus.repository';
import { walletService } from '../../wallet/service/wallet.service';
import { ledgerService } from '../../ledger/service/ledger.service';
import { notificationService } from '../../notifications/service/notification.service';
import { userService } from '../../users/service/user.service';
import prisma from '../../../config/database';
import { POOL_BONUS_ERRORS, POOL_BONUS_SUCCESS, MAX_PENDING_REQUESTS_PER_USER } from '../constants/poolBonus.constants';
import { CreatePoolBonusRequestDTO, PoolBonusRequestQueryDTO, ApprovePoolBonusRequestDTO, UpdatePoolBonusRequestDTO, RejectPoolBonusRequestDTO } from '../types/poolBonus.types';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../../../utils/errors';
import { PoolBonusRequestStatus, PoolBonusRequestType, WalletType, LedgerType, ReferenceType, NotificationType, UserRole } from '@prisma/client';

export class PoolBonusService {
  /**
   * Create a new pool bonus request (user)
   */
  async createRequest(userId: string, data: CreatePoolBonusRequestDTO) {
    // Check for existing pending request
    const existingPending = await poolBonusRepository.findPendingByUserId(userId);
    if (existingPending) {
      throw new ConflictError(POOL_BONUS_ERRORS.REQUEST_ALREADY_PENDING);
    }

    // Withdraw password must be set, the 24h post-change lock must have
    // expired, and the submitted password must match.
    await userService.assertWithdrawalAllowed(userId, data.withdrawPassword);

    // Check pool bonus balance
    const balance = await walletService.getBalance(userId, WalletType.POOL_BONUS);
    if (balance < data.requestedAmount) {
      throw new BadRequestError(POOL_BONUS_ERRORS.INSUFFICIENT_BALANCE);
    }

    // Validate withdrawal has destination address
    if (!data.destinationAddress) {
      throw new BadRequestError(POOL_BONUS_ERRORS.DESTINATION_ADDRESS_REQUIRED);
    }

    // Create request
    const request = await poolBonusRepository.create({
      userId,
      requestType: data.requestType,
      requestedAmount: data.requestedAmount,
      destinationAddress: data.destinationAddress,
      network: data.network,
    });

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: UserRole.ADMIN } });
    for (const admin of admins) {
      await notificationService.sendToUser(
        admin.id,
        NotificationType.SYSTEM,
        'New Pool Bonus Request',
        `User ${request.user.name || request.user.email} requested withdrawal of ${data.requestedAmount} USDT from pool bonus.`,
        { requestId: request.id, userId, requestType: data.requestType, amount: data.requestedAmount }
      );
    }

    return request;
  }

  /**
   * Get user's own requests
   */
  async getUserRequests(userId: string, query: PoolBonusRequestQueryDTO) {
    return poolBonusRepository.findByUserId(userId, {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      status: query.status,
    });
  }

  /**
   * Get single request by ID (user can only see own)
   */
  async getRequestById(userId: string, requestId: string) {
    const request = await poolBonusRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError(POOL_BONUS_ERRORS.REQUEST_NOT_FOUND);
    }
    if (request.userId !== userId) {
      throw new NotFoundError(POOL_BONUS_ERRORS.REQUEST_NOT_FOUND);
    }
    return request;
  }

  /**
   * Cancel a pending request (user)
   */
  async cancelRequest(userId: string, requestId: string) {
    const request = await poolBonusRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError(POOL_BONUS_ERRORS.REQUEST_NOT_FOUND);
    }
    if (request.userId !== userId) {
      throw new NotFoundError(POOL_BONUS_ERRORS.REQUEST_NOT_FOUND);
    }
    if (request.status !== PoolBonusRequestStatus.PENDING) {
      throw new BadRequestError(POOL_BONUS_ERRORS.CANNOT_CANCEL_PROCESSED);
    }

    return poolBonusRepository.updateStatus(requestId, PoolBonusRequestStatus.REJECTED, {
      rejectionReason: 'Cancelled by user',
      adminNote: 'User cancelled the request',
    });
  }

  /**
   * Admin: Get all requests
   */
  async getAllRequests(query: PoolBonusRequestQueryDTO) {
    return poolBonusRepository.findAll({
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      status: query.status,
      requestType: query.requestType,
    });
  }

  /**
   * Admin: Get single request
   */
  async getAdminRequestById(requestId: string) {
    const request = await poolBonusRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError(POOL_BONUS_ERRORS.REQUEST_NOT_FOUND);
    }
    return request;
  }

  /**
   * Admin: Approve request (amount stays same)
   */
  async approveRequest(adminId: string, requestId: string, data: ApprovePoolBonusRequestDTO) {
    const request = await poolBonusRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError(POOL_BONUS_ERRORS.REQUEST_NOT_FOUND);
    }
    if (request.status !== PoolBonusRequestStatus.PENDING) {
      throw new BadRequestError(POOL_BONUS_ERRORS.REQUEST_NOT_PENDING);
    }
    if (request.userId === adminId) {
      throw new ForbiddenError(POOL_BONUS_ERRORS.SELF_APPROVAL_NOT_ALLOWED);
    }

    // Approve with same amount
    const approved = await poolBonusRepository.update(requestId, {
      status: PoolBonusRequestStatus.APPROVED,
      approvedAmount: request.requestedAmount,
      adminId,
      approvedAt: new Date(),
      adminNote: data.adminNote,
    });

    // Execute the request
    const result = await this.executeRequest(approved);

    // Notify user
    await notificationService.sendToUser(
      request.userId,
      NotificationType.CYCLE,
      'Pool Bonus Request Approved',
      `Your pool bonus request of ${request.requestedAmount} USDT has been approved and processed.`,
      { requestId: request.id, approvedAmount: request.requestedAmount }
    );

    return result;
  }

  /**
   * Admin: Update amount and approve
   */
  async updateAndApproveRequest(adminId: string, requestId: string, data: UpdatePoolBonusRequestDTO) {
    const request = await poolBonusRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError(POOL_BONUS_ERRORS.REQUEST_NOT_FOUND);
    }
    if (request.status !== PoolBonusRequestStatus.PENDING) {
      throw new BadRequestError(POOL_BONUS_ERRORS.REQUEST_NOT_PENDING);
    }
    if (request.userId === adminId) {
      throw new ForbiddenError(POOL_BONUS_ERRORS.SELF_APPROVAL_NOT_ALLOWED);
    }

    const requestedAmount = Number(request.requestedAmount);
    if (data.approvedAmount > requestedAmount) {
      throw new BadRequestError(POOL_BONUS_ERRORS.APPROVED_AMOUNT_EXCEEDS_REQUEST);
    }

    // Check balance for approved amount
    const balance = await walletService.getBalance(request.userId, WalletType.POOL_BONUS);
    if (balance < data.approvedAmount) {
      throw new BadRequestError(POOL_BONUS_ERRORS.INSUFFICIENT_BALANCE);
    }

    const approved = await poolBonusRepository.update(requestId, {
      status: PoolBonusRequestStatus.APPROVED,
      approvedAmount: data.approvedAmount,
      adminId,
      approvedAt: new Date(),
      adminNote: data.adminNote,
    });

    const result = await this.executeRequest(approved);

    await notificationService.sendToUser(
      request.userId,
      NotificationType.CYCLE,
      'Pool Bonus Request Approved (Amount Updated)',
      `Your pool bonus request was approved with updated amount of ${data.approvedAmount} USDT (original: ${requestedAmount}).`,
      { requestId: request.id, approvedAmount: data.approvedAmount, originalAmount: requestedAmount }
    );

    return result;
  }

  /**
   * Admin: Reject request
   */
  async rejectRequest(adminId: string, requestId: string, data: RejectPoolBonusRequestDTO) {
    const request = await poolBonusRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError(POOL_BONUS_ERRORS.REQUEST_NOT_FOUND);
    }
    if (request.status !== PoolBonusRequestStatus.PENDING) {
      throw new BadRequestError(POOL_BONUS_ERRORS.REQUEST_NOT_PENDING);
    }

    const rejected = await poolBonusRepository.update(requestId, {
      status: PoolBonusRequestStatus.REJECTED,
      adminId,
      rejectionReason: data.rejectionReason,
      approvedAt: new Date(),
    });

    await notificationService.sendToUser(
      request.userId,
      NotificationType.CYCLE,
      'Pool Bonus Request Rejected',
      `Your pool bonus request was rejected. Reason: ${data.rejectionReason}`,
      { requestId: request.id, reason: data.rejectionReason }
    );

    return rejected;
  }

  /**
   * Execute an approved request (internal)
   */
  private async executeRequest(request: any) {
    const amount = Number(request.approvedAmount);
    const userId = request.userId;

    try {
      if (request.requestType !== PoolBonusRequestType.WITHDRAW) {
        throw new BadRequestError(`Unsupported pool bonus request type: ${request.requestType}`);
      }

      // Debit from POOL_BONUS
      const debitResult = await walletService.debitWallet(userId, WalletType.POOL_BONUS, amount);
      await ledgerService.createEntry({
        userId,
        walletId: debitResult.wallet.id,
        type: LedgerType.WITHDRAWAL,
        credit: 0,
        debit: amount,
        beforeBalance: debitResult.beforeBalance,
        afterBalance: debitResult.afterBalance,
        description: `Pool bonus withdrawal to ${request.destinationAddress} (admin approved)`,
        referenceId: request.id,
        referenceType: ReferenceType.WITHDRAWAL,
      });

      // Create withdrawal record for blockchain processing
      await prisma.withdrawal.create({
        data: {
          userId,
          walletType: 'POOL_BONUS' as any,
          amount,
          fee: 0,
          penalty: 0,
          netAmount: amount,
          destinationAddress: request.destinationAddress,
          network: request.network || process.env.BLOCKCHAIN_NETWORK || 'bsc-mainnet',
          status: 'PENDING',
        },
      });

      // Mark as processed
      return poolBonusRepository.updateStatus(request.id, PoolBonusRequestStatus.PROCESSED, {
        processedAt: new Date(),
      });
    } catch (error: any) {
      // Mark as failed
      await poolBonusRepository.updateStatus(request.id, PoolBonusRequestStatus.FAILED, {
        failureReason: error.message,
        processedAt: new Date(),
      });
      throw error;
    }
  }
}

export const poolBonusService = new PoolBonusService();
export default poolBonusService;
