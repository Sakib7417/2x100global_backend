import { UserStatus, UserRole } from '@prisma/client';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  role: UserRole;
  referralCode: string;
  walletAddress: string | null;
  rank: string;
  autoTradeStatus: boolean;
  status: UserStatus;
  sponsorTradeBonusExpiry: Date | null;
  sponsorTradeBonusRate: number | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserUpdateInput {
  name?: string;
  phone?: string;
  country?: string;
  walletAddress?: string;
}

export interface UserDashboardSummary {
  profile: UserProfile;
  wallets: Record<string, string>;
  totalDeposits: number;
  totalWithdrawals: number;
  totalReferrals: number;
  directReferrals: number;
  teamSize: number;
  rank: string;
  autoTradeStatus: boolean;
}
