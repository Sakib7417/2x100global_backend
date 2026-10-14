export interface ReferralQueryDTO {
  level?: number;
  page?: number;
  limit?: number;
}

export interface ReferralTreeDTO {
  userId: string;
  level: number;
  directReferrals: number;
  children: ReferralTreeDTO[];
}
