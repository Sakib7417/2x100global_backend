export interface CreateSettingDTO {
  key: string;
  value: string;
  description?: string;
  category?: string;
}

export interface UpdateSettingDTO {
  value: string;
  description?: string;
  category?: string;
}
