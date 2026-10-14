export interface SettingItem {
  key: string;
  value: string;
  description?: string;
  category?: string;
  updatedAt: Date;
  updatedBy?: string | null;
}

export type SettingCategory = 'GENERAL' | 'BLOCKCHAIN' | 'TRADING' | 'REFERRAL' | 'WITHDRAWAL' | 'RANK' | 'CYCLE' | 'SECURITY';
