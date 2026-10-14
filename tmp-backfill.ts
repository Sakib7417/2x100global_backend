import { PrismaClient, WalletType } from '@prisma/client';
import { referralService } from './src/modules/referral/service/referral.service';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const allWalletTypes: WalletType[] = [
  'PRINCIPAL',
  'DEPOSIT_BONUS',
  'REFERRAL',
  'TRADING_PROFIT',
  'RANK_BONUS',
  'POOL_BONUS',
  'ADMIN_COMMISSION',
];

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Checking ${users.length} users...`);

  for (const user of users) {
    // Ensure all wallet types exist
    const existingWallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      select: { type: true },
    });
    const existingTypes = new Set(existingWallets.map((w) => w.type));

    for (const type of allWalletTypes) {
      if (!existingTypes.has(type)) {
        await prisma.wallet.create({
          data: {
            userId: user.id,
            type,
            balance: 0,
            totalCredit: 0,
            totalDebit: 0,
          },
        });
        console.log(`[wallet] created ${type} for user ${user.id}`);
      }
    }

    // Ensure referral relationship exists if user has a sponsor
    if (user.sponsorId) {
      const existingReferral = await prisma.referral.findUnique({
        where: { userId: user.id },
      });

      if (!existingReferral) {
        try {
          await referralService.createReferral(user.id, user.sponsorId);
          console.log(`[referral] created for user ${user.id} under ${user.sponsorId}`);
        } catch (error: any) {
          console.error(`[referral] failed for user ${user.id}:`, error.message);
        }
      }
    }
  }

  console.log('Backfill complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
