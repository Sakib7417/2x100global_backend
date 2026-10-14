import { Prisma } from '@prisma/client';
import { adminRepository } from '../repository/admin.repository';
import { userRepository } from '../../users/repository/user.repository';
import { settingsService } from '../../settings/service/settings.service';
import { settingsRepository } from '../../settings/repository/settings.repository';
import { cronService } from '../../cron/cron.service';
import { ADMIN_ERRORS } from '../constants/admin.constants';
import prisma from '../../../config/database';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../utils/errors';
import { UserActionDTO, ListQueryDTO, UpdateConfigDTO, TradeScheduleDTO, AddTradeExclusionDTO } from '../dto/admin.dto';

const serializeAdminData = (value: unknown): unknown => {
  if (value instanceof Prisma.Decimal) return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serializeAdminData);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !['password', 'token', 'refreshToken'].includes(key))
        .map(([key, nestedValue]) => [key, serializeAdminData(nestedValue)]),
    );
  }
  return value;
};

export class AdminService {
  async getDashboardStats() {
    return adminRepository.getDashboardStats();
  }

  async getAnalytics() {
    return adminRepository.getAnalytics();
  }

  async listUsers(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listUsers({
      ...this.getListOptions(query),
      role: query.role,
    }));
  }

  async getUserDetail(userId: string) {
    const user = await adminRepository.findUserById(userId);
    if (!user) throw new NotFoundError(ADMIN_ERRORS.USER_NOT_FOUND);
    return serializeAdminData(user);
  }

  async listDeposits(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listDeposits(this.getListOptions(query)));
  }

  async listWithdrawals(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listWithdrawals(this.getListOptions(query)));
  }

  async listTrades(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listTrades(this.getListOptions(query)));
  }

  async listWallets(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listWallets(this.getListOptions(query)));
  }

  async listReferrals(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listReferrals(this.getListOptions(query)));
  }

  async listRanks(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listRanks(this.getListOptions(query)));
  }

  async listCycleBonuses(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listCycleBonuses(this.getListOptions(query)));
  }

  async listBlockchainTransactions(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listBlockchainTransactions(this.getListOptions(query)));
  }

  async listNotifications(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listNotifications(this.getListOptions(query)));
  }

  async listAuditLogs(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listAuditLogs(this.getListOptions(query)));
  }

  async listSettings(query: ListQueryDTO) {
    return serializeAdminData(await adminRepository.listSettings(this.getListOptions(query)));
  }

  async manageUser(adminId: string, data: UserActionDTO) {
    const user = await userRepository.findById(data.userId);
    if (!user) throw new NotFoundError(ADMIN_ERRORS.USER_NOT_FOUND);
    if (user.role === 'ADMIN') throw new ForbiddenError(ADMIN_ERRORS.CANNOT_MODIFY_ADMIN);

    if (data.action === 'DELETE') {
      return serializeAdminData(await userRepository.update(data.userId, { deletedAt: new Date() }));
    }

    let status = user.status;
    switch (data.action) {
      case 'BAN':
      case 'SUSPEND':
        status = 'SUSPENDED';
        break;
      case 'UNBAN':
      case 'ACTIVATE':
        status = 'ACTIVE';
        break;
      default:
        throw new BadRequestError(ADMIN_ERRORS.INVALID_ACTION);
    }

    return serializeAdminData(await userRepository.updateStatus(data.userId, status));
  }

  async updateConfig(adminId: string, data: UpdateConfigDTO) {
    return settingsService.upsert(data.key, data.value, adminId, data.description);
  }

  private parseTime(time: string): { hour: number; minute: number } {
    const [hour, minute] = time.split(':').map((v) => parseInt(v, 10));
    return { hour, minute };
  }

  async getTradeSchedule(): Promise<TradeScheduleDTO> {
    const { morning, evening } = await settingsRepository.getTradeSchedule();
    return {
      morning: { ...this.parseTime(morning), time: morning },
      evening: { ...this.parseTime(evening), time: evening },
    };
  }

  async updateTradeSchedule(adminId: string, morning?: string, evening?: string): Promise<TradeScheduleDTO> {
    if (morning) {
      await settingsService.upsert('MORNING_TRADE_TIME', morning, adminId, 'Morning trade window open time', 'TRADING');
    }
    if (evening) {
      await settingsService.upsert('EVENING_TRADE_TIME', evening, adminId, 'Evening trade window open time', 'TRADING');
    }
    await cronService.rescheduleTradeTasks();
    return this.getTradeSchedule();
  }

  async getTradingStatus() {
    const [enabled, schedule] = await Promise.all([
      settingsRepository.isTradingEnabled(),
      this.getTradeSchedule(),
    ]);
    return { enabled, schedule };
  }

  async toggleTrading(adminId: string, enabled: boolean) {
    await settingsService.upsert('TRADING_ENABLED', String(enabled), adminId, 'Global trading enabled/disabled switch', 'TRADING');
    return { enabled };
  }

  async listTradeExclusions(query: ListQueryDTO) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);

    const [exclusions, total] = await Promise.all([
      prisma.tradeExclusion.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, autoTradeStatus: true, status: true } },
        },
      }),
      prisma.tradeExclusion.count(),
    ]);

    return {
      exclusions: serializeAdminData(exclusions),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async addTradeExclusion(_adminId: string, data: AddTradeExclusionDTO) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new NotFoundError(ADMIN_ERRORS.USER_NOT_FOUND);
    if (user.role === 'ADMIN') throw new BadRequestError('Cannot modify admin users');

    return prisma.tradeExclusion.upsert({
      where: { userId: data.userId },
      update: { reason: data.reason },
      create: {
        userId: data.userId,
        reason: data.reason,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async removeTradeExclusion(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError(ADMIN_ERRORS.USER_NOT_FOUND);

    await prisma.tradeExclusion.deleteMany({ where: { userId } });
    return { userId, excluded: false };
  }

  private getListOptions(query: ListQueryDTO) {
    return {
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 20),
      status: query.status,
      search: query.search,
    };
  }

  async toggleContentCreator(userId: string, isContentCreator: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (user.role === 'ADMIN') throw new BadRequestError('Cannot modify admin users');

    return prisma.user.update({
      where: { id: userId },
      data: { isContentCreator },
      select: { id: true, name: true, email: true, isContentCreator: true },
    });
  }

  async listContentCreators() {
    return prisma.user.findMany({
      where: { isContentCreator: true },
      select: { id: true, name: true, email: true, isContentCreator: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const adminService = new AdminService();
