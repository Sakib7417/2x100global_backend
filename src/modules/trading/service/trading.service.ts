import crypto from 'crypto';
import { tradingRepository } from '../repository/trading.repository';
import { walletService } from '../../wallet/service/wallet.service';
import { ledgerService } from '../../ledger/service/ledger.service';
import { settingsRepository } from '../../settings/repository/settings.repository';
import prisma from '../../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../utils/errors';
import { TradeQueryDTO } from '../types/trading.types';
import {
  NORMAL_TRADE_PROFIT_RATE,
  TRADE_CODE_LENGTH,
  TRADE_CODE_VALIDITY_MINUTES,
  TOTAL_PLAN_TRADES,
  PENALTY_FREE_TRADE_RATIO,
} from '../constants/trading.constants';
import { TradeStatus, TradeType, WalletType, LedgerType, UserRole } from '@prisma/client';

export class TradingService {
  /**
   * Generate a session code at the start of a trade window (called by cron).
   * One code shared by ALL users; valid for TRADE_CODE_VALIDITY_MINUTES.
   * Any still-active session of the same type is closed first so there is
   * never more than one live code per window.
   */
  async generateSessionCode(tradeType: TradeType) {
    const isEnabled = await settingsRepository.isTradingEnabled();
    if (!isEnabled) {
      console.log('[TRADE] Trading is globally disabled. Skipping session.');
      return null;
    }

    await prisma.tradeSession.updateMany({
      where: { sessionType: tradeType, isActive: true },
      data: { isActive: false },
    });

    const code = crypto
      .randomBytes(Math.ceil(TRADE_CODE_LENGTH / 2))
      .toString('hex')
      .toUpperCase()
      .slice(0, TRADE_CODE_LENGTH);

    const session = await prisma.tradeSession.create({
      data: {
        sessionType: tradeType,
        code,
        expiresAt: new Date(Date.now() + TRADE_CODE_VALIDITY_MINUTES * 60 * 1000),
      },
    });

    console.log(`[TRADE] ${tradeType} session opened — code valid until ${session.expiresAt.toISOString()}`);
    return session;
  }

  /**
   * Next session window (morning/evening) based on the configured schedule.
   * If both of today's windows have passed, the first window tomorrow.
   */
  private async nextSessionWindow() {
    const { morning, evening } = await settingsRepository.getTradeSchedule();
    const now = new Date();

    const candidates = [
      { type: TradeType.MORNING, time: morning },
      { type: TradeType.EVENING, time: evening },
    ]
      .map(({ type, time }) => {
        const [h, m] = (time || '00:00').split(':').map(Number);
        const at = new Date(now);
        at.setHours(h, m, 0, 0);
        return { type, at };
      })
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    for (const c of candidates) {
      if (c.at.getTime() > now.getTime()) {
        return { at: c.at, type: c.type };
      }
    }

    const first = candidates[0];
    const at = new Date(first.at);
    at.setDate(at.getDate() + 1);
    return { at, type: first.type };
  }

  /**
   * Currently live session (code + countdown) plus whether this user has
   * already traded it. Drives the trading page UI.
   */
  async getActiveSession(userId: string) {
    const session = await prisma.tradeSession.findFirst({
      where: { isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { generatedAt: 'desc' },
    });

    const next = session ? null : await this.nextSessionWindow();

    if (!session) {
      return {
        session: null,
        hasTraded: false,
        nextSessionAt: next?.at ?? null,
        nextSessionType: next?.type ?? null,
      };
    }

    const existing = await prisma.trade.findUnique({
      where: { userId_sessionId: { userId, sessionId: session.id } },
      select: { id: true },
    });

    return {
      session: {
        id: session.id,
        code: session.code,
        sessionType: session.sessionType,
        expiresAt: session.expiresAt,
        remainingSeconds: Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)),
      },
      hasTraded: Boolean(existing),
      nextSessionAt: null,
      nextSessionType: null,
    };
  }

  /**
   * Manual trade entry — user submits the session code before it expires.
   * Executes and settles immediately: no pending window, profit credits
   * straight to the Trading Profit wallet.
   */
  async submitTradeCode(userId: string, code: string) {
    const now = new Date();

    const isEnabled = await settingsRepository.isTradingEnabled();
    if (!isEnabled) {
      throw new BadRequestError('Trading is currently disabled');
    }

    const session = await prisma.tradeSession.findFirst({
      where: { isActive: true, expiresAt: { gt: now } },
      orderBy: { generatedAt: 'desc' },
    });

    if (!session || session.code !== code.trim().toUpperCase()) {
      throw new BadRequestError('Invalid or expired trade code');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (user.status !== 'ACTIVE') throw new ForbiddenError('Account is not active');

    const exclusion = await prisma.tradeExclusion.findUnique({ where: { userId } });
    if (exclusion) throw new ForbiddenError('Your account is excluded from trading');

    // Fast-fail before the balance work — the unique constraint on
    // (userId, sessionId) still guards the race below.
    const alreadyTraded = await prisma.trade.findUnique({
      where: { userId_sessionId: { userId, sessionId: session.id } },
      select: { id: true },
    });
    if (alreadyTraded) {
      throw new BadRequestError('You have already traded in this session');
    }

    const principalBalance = await walletService.getBalance(userId, WalletType.PRINCIPAL);
    if (principalBalance <= 0) {
      throw new BadRequestError('Insufficient principal balance to trade');
    }

    const tradeAmount = Number((principalBalance * 0.01).toFixed(8));
    if (tradeAmount <= 0) {
      throw new BadRequestError('Insufficient principal balance to trade');
    }

    // Lock 1% of Principal for the trade entry
    const debitResult = await walletService.debitWallet(userId, WalletType.PRINCIPAL, tradeAmount);
    await ledgerService.createEntry({
      userId,
      walletId: debitResult.wallet.id,
      type: LedgerType.TRADE_ENTRY,
      credit: 0,
      debit: tradeAmount,
      beforeBalance: debitResult.beforeBalance,
      afterBalance: debitResult.afterBalance,
      description: `Trade Entry (${session.sessionType}) - 1% of Principal`,
      referenceType: 'TRADE',
    });

    let trade;
    try {
      trade = await tradingRepository.create({
        userId,
        sessionId: session.id,
        tradeAmount,
        tradeType: session.sessionType,
        status: TradeStatus.PENDING,
        entryTime: now,
        settlementTime: now, // settles immediately
        metadata: { principalAtEntry: principalBalance, sessionCode: session.code },
      });
    } catch (error: any) {
      // Unique (userId, sessionId) violation — concurrent double submit.
      if (error?.code === 'P2002') {
        throw new BadRequestError('You have already traded in this session');
      }
      throw error;
    }

    const settled = await this.settleSingleTrade(trade.id);

    return {
      trade: settled,
      sessionType: session.sessionType,
      profit: settled ? Number(settled.profit) : 0,
    };
  }

  /**
   * Legacy alias — admin manual trigger now opens a code session rather than
   * force-executing trades for all users.
   */
  async executeTradeSession(tradeType: TradeType = TradeType.MORNING) {
    const session = await this.generateSessionCode(tradeType);
    return { session, totalExecuted: 0, trades: [] };
  }

  /**
   * Settle one pending trade: return the staked amount to Principal, split the
   * gross profit 60% user (Trading Profit wallet) / 40% admin commission.
   * Returns null when the trade was already settled by another process.
   */
  private async settleSingleTrade(tradeId: string) {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { user: true },
    });
    if (!trade || trade.status !== TradeStatus.PENDING) return null;

    const tradeAmount = Number(trade.tradeAmount);

    // Sponsor trade bonus rate takes priority while it is still valid.
    const now = new Date();
    const hasActiveBonus = trade.user.sponsorTradeBonusExpiry && trade.user.sponsorTradeBonusExpiry > now;
    const profitRate = hasActiveBonus && trade.user.sponsorTradeBonusRate
      ? trade.user.sponsorTradeBonusRate
      : NORMAL_TRADE_PROFIT_RATE;
    const grossProfit = Number((tradeAmount * profitRate).toFixed(8));

    // 60% User Profit, 40% Admin Commission
    const userProfit = Number((grossProfit * 0.60).toFixed(8));
    const adminCommission = Number((grossProfit * 0.40).toFixed(8));

    // Atomically mark completed; skip wallet side effects if already settled.
    const settledTrade = await tradingRepository.settleTrade(trade.id, {
      status: TradeStatus.COMPLETED,
      profit: userProfit,
      commission: adminCommission,
      profitPercentage: profitRate * 100,
      exitTime: new Date(),
    });

    if (!settledTrade) {
      console.log(`[TRADE] Skipping already settled trade ${trade.id}`);
      return null;
    }

    // Return original 1% trade amount back to Principal Wallet
    const creditPrincipal = await walletService.creditWallet(trade.userId, WalletType.PRINCIPAL, tradeAmount);
    await ledgerService.createEntry({
      userId: trade.userId,
      walletId: creditPrincipal.wallet.id,
      type: LedgerType.TRADE_EXIT,
      credit: tradeAmount,
      debit: 0,
      beforeBalance: creditPrincipal.beforeBalance,
      afterBalance: creditPrincipal.afterBalance,
      description: `Return Principal trade entry amount (${trade.tradeType})`,
      referenceId: trade.id,
      referenceType: 'TRADE',
    });

    // 1. Credit 60% profit to User's Trading Profit Wallet
    if (userProfit > 0) {
      const userWalletResult = await walletService.creditWallet(trade.userId, WalletType.TRADING_PROFIT, userProfit);
      await ledgerService.createEntry({
        userId: trade.userId,
        walletId: userWalletResult.wallet.id,
        type: LedgerType.TRADE_PROFIT,
        credit: userProfit,
        debit: 0,
        beforeBalance: userWalletResult.beforeBalance,
        afterBalance: userWalletResult.afterBalance,
        description: `Trading Profit Share (60%) - Trade #${trade.id.substring(0, 8)}`,
        referenceId: trade.id,
        referenceType: 'TRADE',
      });
    }

    // 2. Credit 40% commission to Admin Commission Wallet
    if (adminCommission > 0) {
      const adminUser = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
      });

      if (adminUser) {
        const adminWalletResult = await walletService.creditWallet(adminUser.id, WalletType.ADMIN_COMMISSION, adminCommission);
        await ledgerService.createEntry({
          userId: adminUser.id,
          walletId: adminWalletResult.wallet.id,
          type: LedgerType.ADMIN_COMMISSION,
          credit: adminCommission,
          debit: 0,
          beforeBalance: adminWalletResult.beforeBalance,
          afterBalance: adminWalletResult.afterBalance,
          description: `Admin Trading Commission Share (40%) - Trade #${trade.id.substring(0, 8)}`,
          referenceId: trade.id,
          referenceType: 'TRADE',
        });
      }
    }

    return settledTrade;
  }

  /**
   * Settle all pending trades past settlementTime — safety net for trades
   * created before instant settlement, and any stragglers left PENDING.
   */
  async settlePendingTrades() {
    const pendingTrades = await tradingRepository.findPendingTradesToSettle();
    const settledResults = [];

    for (const trade of pendingTrades) {
      try {
        const settled = await this.settleSingleTrade(trade.id);
        if (settled) settledResults.push(settled);
      } catch (error) {
        console.error(`Failed to settle trade ${trade.id}:`, error);
      }
    }

    return {
      settledCount: settledResults.length,
      trades: settledResults,
    };
  }

  /**
   * Get user trades
   */
  async getUserTrades(userId: string, query: TradeQueryDTO) {
    return tradingRepository.findByUserId(userId, query);
  }

  /**
   * Get trade by ID
   */
  async getTradeById(id: string) {
    const trade = await tradingRepository.findById(id);
    if (!trade) {
      throw new NotFoundError('Trade not found');
    }
    return trade;
  }

  /**
   * Get trade statistics plus the user's progress through the 200-trade plan.
   * `tradePlan.penaltyFree` is true once 70% of plan trades are completed
   * SINCE money last entered PRINCIPAL — deposits and wallet transfers-in
   * restart the counter via `tradeCountBaseline`.
   */
  async getStatistics(userId?: string) {
    const stats = await tradingRepository.getStatistics(userId);
    const penaltyFreeAt = Math.ceil(TOTAL_PLAN_TRADES * PENALTY_FREE_TRADE_RATIO);
    const baseline = userId
      ? (await prisma.user.findUnique({
          where: { id: userId },
          select: { tradeCountBaseline: true },
        }))?.tradeCountBaseline ?? 0
      : 0;
    const tradesSinceInflow = Math.max(0, stats.completedTrades - baseline);

    return {
      ...stats,
      tradesSinceInflow,
      tradeCountBaseline: baseline,
      tradePlan: {
        totalTrades: TOTAL_PLAN_TRADES,
        penaltyFreeAt,
        completionPercent: Math.min(100, (tradesSinceInflow / TOTAL_PLAN_TRADES) * 100),
        penaltyFree: tradesSinceInflow >= penaltyFreeAt,
      },
    };
  }

  /**
   * Get recent completed trades for the public activity feed.
   */
  async getRecentTrades(limit = 20) {
    return tradingRepository.findRecent(limit);
  }

  /**
   * Get all trades (admin)
   */
  async getAllTrades(query: TradeQueryDTO) {
    return tradingRepository.findAll(query);
  }
}

export const tradingService = new TradingService();
export default tradingService;
