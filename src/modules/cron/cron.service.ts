import cron from 'node-cron';
import { depositService } from '../deposit/service/deposit.service';
import { tradingService } from '../trading/service/trading.service';
import { rankService } from '../rank/service/rank.service';
import { cycleBonusService } from '../cycleBonus/service/cycleBonus.service';
import { notificationService } from '../notifications/service/notification.service';
import { cronLogger } from './cronLogger';
import prisma from '../../config/database';
import { settingsRepository } from '../settings/repository/settings.repository';
import { TradeType } from '@prisma/client';

export class CronService {
  private tasks: cron.ScheduledTask[] = [];
  private tradeTasks: cron.ScheduledTask[] = [];

  private async withLog<T>(jobName: string, fn: () => Promise<T>): Promise<void> {
    const log = await cronLogger.logStart(jobName);
    let recordsProcessed = 0;
    let recordsFailed = 0;
    let errorMessage: string | undefined;
    try {
      const result: any = await fn();
      recordsProcessed = typeof result?.processedCount === 'number' ? result.processedCount : typeof result?.settledCount === 'number' ? result.settledCount : typeof result?.length === 'number' ? result.length : 0;
      await cronLogger.logComplete(log.id, 'SUCCESS', recordsProcessed, recordsFailed, undefined, result);
    } catch (error) {
      errorMessage = (error as Error).message;
      await cronLogger.logComplete(log.id, 'FAILED', recordsProcessed, 1, errorMessage, { stack: (error as Error).stack });
    }
  }

  private timeToCronExpression(time: string): string {
    const [hour, minute] = time.split(':').map((v) => parseInt(v, 10));
    const validHour = Number.isNaN(hour) ? 9 : Math.max(0, Math.min(23, hour));
    const validMinute = Number.isNaN(minute) ? 0 : Math.max(0, Math.min(59, minute));
    return `${validMinute} ${validHour} * * *`;
  }

  private async getTradeCronSchedules() {
    const { morning, evening } = await settingsRepository.getTradeSchedule();
    const morningTime = morning || process.env.MORNING_TRADE_TIME || '09:00';
    const eveningTime = evening || process.env.EVENING_TRADE_TIME || '18:00';
    return {
      morning: this.timeToCronExpression(morningTime),
      evening: this.timeToCronExpression(eveningTime),
    };
  }

  private async scheduleTradeTasks() {
    const schedules = await this.getTradeCronSchedules();

    this.tradeTasks.forEach((task) => task.stop());
    this.tradeTasks = [];

    console.log(`[CRON] Trade schedule: morning=${schedules.morning}, evening=${schedules.evening}`);

    this.tradeTasks.push(
      cron.schedule(schedules.morning, async () => {
        console.log(`[CRON] Morning trade session opened at ${new Date().toISOString()}`);
        await this.withLog('morning_trade', () => tradingService.generateSessionCode(TradeType.MORNING));
      })
    );

    this.tradeTasks.push(
      cron.schedule(schedules.evening, async () => {
        console.log(`[CRON] Evening trade session opened at ${new Date().toISOString()}`);
        await this.withLog('evening_trade', () => tradingService.generateSessionCode(TradeType.EVENING));
      })
    );
  }

  async rescheduleTradeTasks() {
    await this.scheduleTradeTasks();
    console.log('[CRON] Trade tasks rescheduled');
  }

  startAll() {
    if (this.tasks.length > 0) return; // already started

    const schedules = {
      tradeSettlement: process.env.CRON_TRADE_SETTLEMENT || '*/2 * * * *',
      depositVerification: process.env.CRON_DEPOSIT_VERIFICATION || '*/5 * * * *',
      rankEvaluation: process.env.CRON_RANK_EVALUATION || '0 0 * * *',
      cycleBonus: process.env.CRON_POOL_BONUS || '0 0 */10 * *',
      notificationSender: process.env.CRON_NOTIFICATION_SENDER || '*/10 * * * *',
      dailyReport: process.env.CRON_DAILY_REPORT || '0 23 * * *',
      failedRetry: process.env.CRON_FAILED_RETRY || '0 */30 * * *',
    };

    this.scheduleTradeTasks();

    // Trade settlement every 2 minutes
    this.tasks.push(
      cron.schedule(schedules.tradeSettlement, async () => {
        await this.withLog('trade_settlement', () => tradingService.settlePendingTrades());
      })
    );

    // Pending deposit retry
    this.tasks.push(
      cron.schedule(schedules.depositVerification, async () => {
        await this.withLog('deposit_verification', () => depositService.retryPendingDeposits());
      })
    );

    // Rank evaluation
    this.tasks.push(
      cron.schedule(schedules.rankEvaluation, async () => {
        await this.withLog('rank_evaluation', async () => {
          const users = await prisma.user.findMany({ where: { deletedAt: null, status: 'ACTIVE' } });
          for (const user of users) {
            try {
              await rankService.evaluateUserRank(user.id);
            } catch (error) {
              console.error(`[CRON] Rank evaluation failed for user ${user.id}:`, error);
            }
          }
          return { processedCount: users.length };
        });
      })
    );

    // Cycle bonus every 10 days
    this.tasks.push(
      cron.schedule(schedules.cycleBonus, async () => {
        await this.withLog('cycle_bonus', () => cycleBonusService.process10DayCycleBonus());
      })
    );

    // Notification sender (process pending or scheduled notifications)
    this.tasks.push(
      cron.schedule(schedules.notificationSender, async () => {
        await this.withLog('notification_sender', async () => {
          // Placeholder for queued notification delivery; no action required for DB-only notifications
          return { processedCount: 0 };
        });
      })
    );

    // Daily report
    this.tasks.push(
      cron.schedule(schedules.dailyReport, async () => {
        await this.withLog('daily_report', async () => {
          const [users, deposits, withdrawals, trades] = await Promise.all([
            prisma.user.count(),
            prisma.deposit.count(),
            prisma.withdrawal.count(),
            prisma.trade.count(),
          ]);
          const totals = await prisma.deposit.aggregate({ _sum: { amount: true } });
          return { users, deposits, withdrawals, trades, totalDepositVolume: totals._sum.amount?.toString() || '0' };
        });
      })
    );

    // Failed transaction retry
    this.tasks.push(
      cron.schedule(schedules.failedRetry, async () => {
        await this.withLog('failed_retry', () => depositService.retryPendingDeposits());
      })
    );

    console.log(`[CRON] ${this.tasks.length} scheduled jobs started`);
  }

  stopAll() {
    this.tasks.forEach((task) => task.stop());
    this.tradeTasks.forEach((task) => task.stop());
    this.tasks = [];
    this.tradeTasks = [];
  }
}

export const cronService = new CronService();
