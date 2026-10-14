import prisma from '../../../config/database';
import { PoolBonusRequestStatus, PoolBonusRequestType } from '@prisma/client';

export class PoolBonusRepository {
  async create(data: {
    userId: string;
    requestType: PoolBonusRequestType;
    requestedAmount: number;
    destinationAddress?: string;
    network?: string;
  }) {
    return prisma.poolBonusRequest.create({
      data: {
        userId: data.userId,
        requestType: data.requestType,
        requestedAmount: data.requestedAmount,
        destinationAddress: data.destinationAddress,
        network: data.network,
        status: PoolBonusRequestStatus.PENDING,
      },
      include: { user: true },
    });
  }

  async findById(id: string) {
    return prisma.poolBonusRequest.findUnique({
      where: { id },
      include: { user: true, admin: true },
    });
  }

  async findByUserId(userId: string, options: { page?: number; limit?: number; status?: PoolBonusRequestStatus } = {}) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const where: any = { userId };
    if (options.status) where.status = options.status;

    const [requests, total] = await Promise.all([
      prisma.poolBonusRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.poolBonusRequest.count({ where }),
    ]);

    return { data: requests, total, page, limit };
  }

  async findAll(options: { page?: number; limit?: number; status?: PoolBonusRequestStatus; requestType?: PoolBonusRequestType } = {}) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.requestType) where.requestType = options.requestType;

    const [requests, total] = await Promise.all([
      prisma.poolBonusRequest.findMany({
        where,
        include: { user: true, admin: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.poolBonusRequest.count({ where }),
    ]);

    return { data: requests, total, page, limit };
  }

  async findPendingByUserId(userId: string) {
    return prisma.poolBonusRequest.findFirst({
      where: {
        userId,
        status: PoolBonusRequestStatus.PENDING,
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.poolBonusRequest.update({
      where: { id },
      data,
      include: { user: true, admin: true },
    });
  }

  async updateStatus(id: string, status: PoolBonusRequestStatus, extra?: any) {
    return prisma.poolBonusRequest.update({
      where: { id },
      data: { status, ...extra },
      include: { user: true, admin: true },
    });
  }
}

export const poolBonusRepository = new PoolBonusRepository();
export default poolBonusRepository;
