export interface AdminStatsDTO {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTrades: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalVolume: number;
}

export interface UserManagementDTO {
  userId: string;
  action: 'BAN' | 'UNBAN' | 'DELETE' | 'UPDATE_ROLE';
  reason?: string;
  newRole?: string;
}

export interface SystemConfigDTO {
  key: string;
  value: string;
  description?: string;
}
