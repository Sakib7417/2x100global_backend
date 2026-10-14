import { prisma } from '../../prisma/client';
import { CronJobStatus } from '@prisma/client';

export class CronLogger {
  async logStart(jobName: string) {
    return prisma.cronLog.create({
      data: {
        jobName,
        status: 'SUCCESS' as any,
        startTime: new Date(),
      },
    });
  }

  async logComplete(id: string, status: CronJobStatus, recordsProcessed: number, recordsFailed: number, errorMessage?: string, metadata?: any) {
    const endTime = new Date();
    const startTime = await prisma.cronLog.findUnique({ where: { id } }).then((l) => l?.startTime || endTime);
    return prisma.cronLog.update({
      where: { id },
      data: {
        status,
        endTime,
        duration: endTime.getTime() - new Date(startTime).getTime(),
        recordsProcessed,
        recordsFailed,
        errorMessage,
        metadata,
      },
    });
  }
}

export const cronLogger = new CronLogger();
