import { BlockchainTransaction, BlockchainTransactionType, BlockchainTransactionStatus } from '@prisma/client';
import prisma from '../../../config/database';

export class BlockchainRepository {
  /**
   * Create blockchain transaction record
   */
  async create(data: {
    transactionHash: string;
    type: BlockchainTransactionType;
    fromAddress: string;
    toAddress: string;
    amount: number;
    tokenContract: string;
    network: string;
    blockNumber?: bigint;
    confirmations?: number;
    status?: BlockchainTransactionStatus;
    rawTransaction?: any;
    receipt?: any;
  }): Promise<BlockchainTransaction> {
    return prisma.blockchainTransaction.create({
      data: {
        transactionHash: data.transactionHash,
        type: data.type,
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        amount: data.amount,
        tokenContract: data.tokenContract,
        network: data.network,
        blockNumber: data.blockNumber,
        confirmations: data.confirmations ?? 0,
        status: data.status ?? BlockchainTransactionStatus.PENDING,
        rawTransaction: data.rawTransaction || {},
        receipt: data.receipt || {},
      },
    });
  }

  /**
   * Find blockchain transaction by hash
   */
  async findByHash(transactionHash: string): Promise<BlockchainTransaction | null> {
    return prisma.blockchainTransaction.findUnique({
      where: { transactionHash },
    });
  }

  /**
   * Find blockchain transaction by ID
   */
  async findById(id: string): Promise<BlockchainTransaction | null> {
    return prisma.blockchainTransaction.findUnique({
      where: { id },
    });
  }

  /**
   * Update blockchain transaction
   */
  async update(
    id: string,
    data: {
      blockNumber?: bigint;
      confirmations?: number;
      status?: BlockchainTransactionStatus;
      receipt?: any;
      verifiedAt?: Date;
    }
  ): Promise<BlockchainTransaction> {
    return prisma.blockchainTransaction.update({
      where: { id },
      data,
    });
  }

  /**
   * Update transaction status
   */
  async updateStatus(
    transactionHash: string,
    status: BlockchainTransactionStatus,
    receipt?: any,
    verifiedAt?: Date
  ): Promise<BlockchainTransaction> {
    return prisma.blockchainTransaction.update({
      where: { transactionHash },
      data: {
        status,
        receipt,
        verifiedAt,
      },
    });
  }

  /**
   * Find pending transactions
   */
  async findPendingTransactions(network?: string): Promise<BlockchainTransaction[]> {
    const where: any = {
      status: BlockchainTransactionStatus.PENDING,
    };
    if (network) where.network = network;

    return prisma.blockchainTransaction.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find transactions by type
   */
  async findByType(type: BlockchainTransactionType, limit: number = 10): Promise<BlockchainTransaction[]> {
    return prisma.blockchainTransaction.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const blockchainRepository = new BlockchainRepository();
export default blockchainRepository;
