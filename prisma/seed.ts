import bcrypt from 'bcrypt';
import { PrismaClient, UserRole, UserStatus, WalletType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ========================================================================
  // 1. CREATE ADMIN USER
  // ========================================================================
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@2x100global.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`⚠️  Admin user already exists: ${adminEmail}`);
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, parseInt(process.env.BCRYPT_ROUNDS || '10'));

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: UserRole.ADMIN,
        referralCode: 'ADMIN001',
        status: UserStatus.ACTIVE,
        autoTradeStatus: false,
	emailVerified: true,
      },
    });

    console.log(`✅ Admin user created: ${admin.email} (ID: ${admin.id})`);

    // ========================================================================
    // 2. INITIALIZE ALL 7 WALLETS FOR ADMIN
    // ========================================================================
    const walletTypes: WalletType[] = [
      WalletType.PRINCIPAL,
      WalletType.DEPOSIT_BONUS,
      WalletType.REFERRAL,
      WalletType.TRADING_PROFIT,
      WalletType.RANK_BONUS,
      WalletType.POOL_BONUS,
      WalletType.ADMIN_COMMISSION,
    ];

    for (const type of walletTypes) {
      await prisma.wallet.create({
        data: {
          userId: admin.id,
          type,
          balance: 0,
          totalCredit: 0,
          totalDebit: 0,
        },
      });
    }

    console.log(`✅ ${walletTypes.length} wallets initialized for admin`);

    // ========================================================================
    // 3. CREATE REFERRAL RECORD FOR ADMIN (root level)
    // ========================================================================
    await prisma.referral.create({
      data: {
        userId: admin.id,
        sponsorId: null,
        level: 0,
      },
    });

    console.log(`✅ Referral record created for admin (root level 0)`);

    // ========================================================================
    // 4. SEED DEFAULT SETTINGS
    // ========================================================================
    const defaultSettings = [
      { key: 'MINIMUM_DEPOSIT', value: process.env.MINIMUM_DEPOSIT || '100', description: 'Minimum USDT deposit amount', category: 'DEPOSIT' },
      { key: 'DEPOSIT_BONUS_PERCENTAGE', value: process.env.DEPOSIT_BONUS_PERCENTAGE || '5', description: 'Deposit bonus percentage', category: 'DEPOSIT' },
      { key: 'DEPOSIT_BONUS_THRESHOLD', value: process.env.DEPOSIT_BONUS_THRESHOLD || '50', description: 'Deposit bonus threshold', category: 'DEPOSIT' },
      { key: 'TRADING_ENABLED', value: process.env.TRADING_ENABLED || 'false', description: 'Global trading enabled/disabled switch', category: 'TRADING' },
      { key: 'TRADE_PERCENTAGE', value: process.env.TRADE_PERCENTAGE || '1', description: 'Percentage of principal used per trade', category: 'TRADING' },
      { key: 'TRADE_DURATION_MINUTES', value: process.env.TRADE_DURATION_MINUTES || '2', description: 'Trade settlement duration in minutes', category: 'TRADING' },
      { key: 'MORNING_TRADE_TIME', value: process.env.MORNING_TRADE_TIME || '09:00', description: 'Morning trade execution time', category: 'TRADING' },
      { key: 'EVENING_TRADE_TIME', value: process.env.EVENING_TRADE_TIME || '18:00', description: 'Evening trade execution time', category: 'TRADING' },
      { key: 'PROFIT_DISTRIBUTION_USER', value: process.env.PROFIT_DISTRIBUTION_USER || '60', description: 'User profit share percentage', category: 'TRADING' },
      { key: 'PROFIT_DISTRIBUTION_ADMIN', value: process.env.PROFIT_DISTRIBUTION_ADMIN || '40', description: 'Admin profit share percentage', category: 'TRADING' },
      { key: 'WITHDRAWAL_FEE_PERCENTAGE', value: process.env.WITHDRAWAL_FEE_PERCENTAGE || '2', description: 'Withdrawal fee percentage', category: 'WITHDRAWAL' },
      { key: 'WITHDRAWAL_PENALTY_PERCENTAGE', value: process.env.WITHDRAWAL_PENALTY_PERCENTAGE || '30', description: 'Early withdrawal penalty percentage', category: 'WITHDRAWAL' },
      { key: 'WITHDRAWAL_PENALTY_DAYS', value: process.env.WITHDRAWAL_PENALTY_DAYS || '90', description: 'Days before withdrawal penalty ends', category: 'WITHDRAWAL' },
      { key: 'MINIMUM_WITHDRAWAL', value: process.env.MINIMUM_WITHDRAWAL || '10', description: 'Minimum withdrawal amount', category: 'WITHDRAWAL' },
      { key: 'CYCLE_DURATION_DAYS', value: process.env.CYCLE_DURATION_DAYS || '10', description: 'Cycle bonus interval in days', category: 'CYCLE' },
      { key: 'REFERRAL_BONUS_TIER1_MIN', value: process.env.REFERRAL_BONUS_TIER1_MIN || '50', description: 'Referral tier 1 minimum deposit', category: 'REFERRAL' },
      { key: 'REFERRAL_BONUS_TIER1_PERCENTAGE', value: process.env.REFERRAL_BONUS_TIER1_PERCENTAGE || '5', description: 'Referral tier 1 bonus percentage', category: 'REFERRAL' },
      { key: 'REFERRAL_BONUS_TIER2_MIN', value: process.env.REFERRAL_BONUS_TIER2_MIN || '1000', description: 'Referral tier 2 minimum deposit', category: 'REFERRAL' },
      { key: 'REFERRAL_BONUS_TIER2_PERCENTAGE', value: process.env.REFERRAL_BONUS_TIER2_PERCENTAGE || '10', description: 'Referral tier 2 bonus percentage', category: 'REFERRAL' },
    ];

    for (const setting of defaultSettings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: {},
        create: {
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: setting.category,
          updatedBy: admin.id,
        },
      });
    }

    console.log(`✅ ${defaultSettings.length} default settings seeded`);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Admin Login Credentials:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
