import { prisma } from '../../../prisma/client';
import { Setting, Prisma } from '@prisma/client';

export class SettingsRepository {
  async findAll(): Promise<Setting[]> {
    return prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(key: string): Promise<Setting | null> {
    return prisma.setting.findUnique({
      where: { key },
    });
  }

  async create(data: Prisma.SettingCreateInput): Promise<Setting> {
    return prisma.setting.create({ data });
  }

  async update(key: string, data: Prisma.SettingUpdateInput): Promise<Setting> {
    return prisma.setting.update({
      where: { key },
      data,
    });
  }

  async upsert(key: string, value: string, description?: string, category?: string, updatedBy?: string) {
    const updater = updatedBy ? { connect: { id: updatedBy } } : undefined;
    return prisma.setting.upsert({
      where: { key },
      update: { value, description, category, updater },
      create: { key, value, description, category, updater },
    });
  }

  async getRequiredDepositWallet(): Promise<string | null> {
    const setting = await this.findByKey('DEPOSIT_WALLET_ADDRESS');
    return setting?.value || process.env.DEPOSIT_WALLET_ADDRESS || null;
  }

  async getTradeSchedule(): Promise<{ morning: string; evening: string }> {
    const morning = (await this.findByKey('MORNING_TRADE_TIME'))?.value || process.env.MORNING_TRADE_TIME || '09:00';
    const evening = (await this.findByKey('EVENING_TRADE_TIME'))?.value || process.env.EVENING_TRADE_TIME || '18:00';
    return { morning, evening };
  }

  async isTradingEnabled(): Promise<boolean> {
    const setting = await this.findByKey('TRADING_ENABLED');
    const value = setting?.value ?? process.env.TRADING_ENABLED ?? 'false';
    return value === 'true' || value === '1';
  }
}

export const settingsRepository = new SettingsRepository();
