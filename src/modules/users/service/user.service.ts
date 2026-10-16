import bcrypt from 'bcrypt';
import { userRepository } from '../repository/user.repository';
import { authRepository } from '../../auth/repository/auth.repository';
import { emailService } from '../../email/service/email.service';
import { UpdateProfileDTO, UserListQueryDTO } from '../dto/user.dto';
import { USER_ERRORS, WITHDRAW_PASSWORD_LOCK_HOURS } from '../constants/user.constants';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../utils/errors';
import { walletService } from '../../wallet/service/wallet.service';

const WITHDRAW_PASSWORD_OTP_PURPOSE = 'WITHDRAW_PASSWORD';
const OTP_VALIDITY_MINUTES = 15;

const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Withdrawals are locked for WITHDRAW_PASSWORD_LOCK_HOURS after the withdraw
 * password was last set/changed. Returns the unlock timestamp while the lock
 * is still active, otherwise null.
 */
const getWithdrawLockUntil = (setAt?: Date | null): Date | null => {
  if (!setAt) return null;
  const until = new Date(setAt.getTime() + WITHDRAW_PASSWORD_LOCK_HOURS * 60 * 60 * 1000);
  return until.getTime() > Date.now() ? until : null;
};

const sanitizeProfile = (user: any) => {
  const profile = { ...user };
  delete profile.password;
  delete profile.withdrawPasswordHash;
  profile.withdrawPasswordSet = Boolean(user.withdrawPasswordHash);
  profile.withdrawLockedUntil = getWithdrawLockUntil(user.withdrawPasswordSetAt);
  if (profile.sponsor) {
    profile.sponsor = { ...profile.sponsor };
    delete profile.sponsor.password;
    delete profile.sponsor.withdrawPasswordHash;
  }
  return profile;
};

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(USER_ERRORS.USER_NOT_FOUND);
    return sanitizeProfile(user);
  }

  async updateProfile(userId: string, data: UpdateProfileDTO) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(USER_ERRORS.USER_NOT_FOUND);

    if (data.walletAddress && data.walletAddress !== user.walletAddress) {
      const existing = await userRepository.findByEmail(data.walletAddress);
      // Simplified uniqueness check not used
    }

    const updated = await userRepository.update(userId, {
      name: data.name,
      phone: data.phone,
      country: data.country,
      walletAddress: data.walletAddress,
    });
    return sanitizeProfile(updated);
  }

  /**
   * Step 1 of the withdraw-password change: email a 6-digit OTP to the
   * account owner. Anyone who hijacks a session can reach this step, but
   * only the mailbox owner can complete step 2 — so an unauthorized change
   * attempt alerts the owner without effect.
   */
  async requestWithdrawPasswordOtp(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(USER_ERRORS.USER_NOT_FOUND);

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
    await authRepository.setEmailOtp(userId, otp, expiresAt, WITHDRAW_PASSWORD_OTP_PURPOSE);
    await emailService.sendWithdrawPasswordOtp(user.email, otp);
  }

  /**
   * Step 2: verify the emailed OTP, then set/change the withdraw password.
   * Every change restarts the 24h lock during which no withdrawal
   * (including pool bonus) can be submitted.
   */
  async setWithdrawPassword(userId: string, withdrawPassword: string, otp: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(USER_ERRORS.USER_NOT_FOUND);

    if (
      user.emailOtp !== otp ||
      user.emailOtpPurpose !== WITHDRAW_PASSWORD_OTP_PURPOSE ||
      !user.emailOtpExpiresAt ||
      user.emailOtpExpiresAt < new Date()
    ) {
      throw new BadRequestError(USER_ERRORS.INVALID_OTP);
    }

    const hash = await bcrypt.hash(
      withdrawPassword,
      parseInt(process.env.BCRYPT_ROUNDS || '10'),
    );
    const setAt = new Date();
    await userRepository.update(userId, {
      withdrawPasswordHash: hash,
      withdrawPasswordSetAt: setAt,
      emailOtp: null,
      emailOtpExpiresAt: null,
      emailOtpPurpose: null,
    });

    return {
      withdrawPasswordSet: true,
      withdrawLockedUntil: getWithdrawLockUntil(setAt),
    };
  }

  /**
   * Guard shared by withdrawal and pool bonus flows:
   *  1. withdraw password must be set
   *  2. the 24h post-change lock must have expired
   *  3. the submitted password must match the stored hash
   */
  async assertWithdrawalAllowed(userId: string, withdrawPassword?: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(USER_ERRORS.USER_NOT_FOUND);

    if (!user.withdrawPasswordHash) {
      throw new BadRequestError(USER_ERRORS.WITHDRAW_PASSWORD_NOT_SET);
    }

    const lockedUntil = getWithdrawLockUntil(user.withdrawPasswordSetAt);
    if (lockedUntil) {
      throw new ForbiddenError(
        `${USER_ERRORS.WITHDRAWAL_LOCKED_PREFIX} ${lockedUntil.toISOString()}`,
      );
    }

    const ok = await bcrypt.compare(withdrawPassword ?? '', user.withdrawPasswordHash);
    if (!ok) {
      throw new BadRequestError(USER_ERRORS.WITHDRAW_PASSWORD_INVALID);
    }
  }

  async toggleAutoTrade(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(USER_ERRORS.USER_NOT_FOUND);
    const updated = await userRepository.toggleAutoTrade(userId);
    const { password, ...profile } = updated as any;
    return { autoTradeStatus: profile.autoTradeStatus };
  }

  async getDashboard(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(USER_ERRORS.USER_NOT_FOUND);

    const summary = await userRepository.getDashboardSummary(userId);
    const walletMap = await walletService.getWalletBalances(userId);

    return {
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        country: user.country,
        role: user.role,
        referralCode: user.referralCode,
        walletAddress: user.walletAddress,
        rank: user.rank,
        autoTradeStatus: user.autoTradeStatus,
        status: user.status,
        isContentCreator: user.isContentCreator,
        sponsorTradeBonusExpiry: user.sponsorTradeBonusExpiry,
        sponsorTradeBonusRate: user.sponsorTradeBonusRate,
        withdrawPasswordSet: Boolean(user.withdrawPasswordHash),
        withdrawLockedUntil: getWithdrawLockUntil(user.withdrawPasswordSetAt),
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      wallets: walletMap,
      directReferrals: summary.directReferrals,
      teamSize: summary.teamSize,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalReferrals: summary.teamSize,
    };
  }

  async listUsers(query: UserListQueryDTO, requestingUserId: string) {
    const requester = await userRepository.findById(requestingUserId);
    if (!requester || requester.role !== 'ADMIN') {
      throw new ForbiddenError(USER_ERRORS.UNAUTHORIZED);
    }

    return userRepository.findAll({
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      search: query.search,
      role: query.role,
      status: query.status,
    });
  }
}

export const userService = new UserService();
