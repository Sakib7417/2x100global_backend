import { settingsRepository } from '../repository/settings.repository';
import { CreateSettingDTO, UpdateSettingDTO } from '../dto/settings.dto';
import { SETTING_ERRORS } from '../constants/settings.constants';
import { NotFoundError } from '../../../utils/errors';

export class SettingsService {
  async getAll() {
    return settingsRepository.findAll();
  }

  async getByKey(key: string) {
    const setting = await settingsRepository.findByKey(key);
    if (!setting) throw new NotFoundError(SETTING_ERRORS.SETTING_NOT_FOUND);
    return setting;
  }

  async create(data: CreateSettingDTO, adminId: string) {
    return settingsRepository.create({
      ...data,
      updater: { connect: { id: adminId } },
    });
  }

  async update(key: string, data: UpdateSettingDTO, adminId: string) {
    const existing = await settingsRepository.findByKey(key);
    if (!existing) throw new NotFoundError(SETTING_ERRORS.SETTING_NOT_FOUND);
    return settingsRepository.update(key, {
      ...data,
      updater: { connect: { id: adminId } },
    });
  }

  async upsert(key: string, value: string, adminId: string, description?: string, category?: string) {
    return settingsRepository.upsert(key, value, description, category, adminId);
  }

  async seedDefaults(adminId: string) {
    const defaults = [
      { key: 'MINIMUM_DEPOSIT', value: process.env.MINIMUM_DEPOSIT || '100', description: 'Minimum USDT deposit amount', category: 'BLOCKCHAIN' },
      { key: 'TRADING_ENABLED', value: process.env.TRADING_ENABLED || 'false', description: 'Global trading enabled/disabled switch', category: 'TRADING' },
      { key: 'TRADE_PERCENTAGE', value: process.env.TRADE_PERCENTAGE || '1', description: 'Percentage of principal used per trade', category: 'TRADING' },
      { key: 'TRADE_DURATION_MINUTES', value: process.env.TRADE_DURATION_MINUTES || '2', description: 'Trade settlement duration', category: 'TRADING' },
      { key: 'MORNING_TRADE_TIME', value: process.env.MORNING_TRADE_TIME || '09:00', description: 'Morning trade execution time', category: 'TRADING' },
      { key: 'EVENING_TRADE_TIME', value: process.env.EVENING_TRADE_TIME || '18:00', description: 'Evening trade execution time', category: 'TRADING' },
      { key: 'PROFIT_DISTRIBUTION_USER', value: process.env.PROFIT_DISTRIBUTION_USER || '60', description: 'User profit share percentage', category: 'TRADING' },
      { key: 'PROFIT_DISTRIBUTION_ADMIN', value: process.env.PROFIT_DISTRIBUTION_ADMIN || '40', description: 'Admin profit share percentage', category: 'TRADING' },
      { key: 'WITHDRAWAL_FEE_PERCENTAGE', value: process.env.WITHDRAWAL_FEE_PERCENTAGE || '15', description: 'Withdrawal fee percentage', category: 'WITHDRAWAL' },
      { key: 'WITHDRAWAL_PENALTY_PERCENTAGE', value: process.env.WITHDRAWAL_PENALTY_PERCENTAGE || '40', description: 'Principal withdrawal penalty until 70% of trade plan is complete', category: 'WITHDRAWAL' },
      { key: 'CYCLE_DURATION_DAYS', value: process.env.CYCLE_DURATION_DAYS || '10', description: 'Cycle bonus interval', category: 'CYCLE' },
    ];

    for (const item of defaults) {
      await settingsRepository.upsert(item.key, item.value, item.description, item.category, adminId);
    }

    return defaults;
  }
}

export const settingsService = new SettingsService();
