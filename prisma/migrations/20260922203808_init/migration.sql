-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('PRINCIPAL', 'DEPOSIT_BONUS', 'REFERRAL', 'TRADING_PROFIT', 'RANK_BONUS', 'POOL_BONUS', 'ADMIN_COMMISSION');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('DEPOSIT', 'DEPOSIT_BONUS', 'REFERRAL_BONUS', 'TRADE_ENTRY', 'TRADE_PROFIT', 'ADMIN_COMMISSION', 'COMPOUND_TRANSFER', 'WITHDRAWAL', 'WITHDRAWAL_FEE', 'PENALTY', 'RANK_BONUS', 'POOL_BONUS', 'REFUND', 'ADJUSTMENT', 'TRADE_EXIT', 'AUTO_TRADE_ENTRY', 'TRADE_CANCEL');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRADE', 'REFERRAL', 'RANK', 'CYCLE', 'WALLET', 'AUTO_TRADE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "WithdrawalWalletType" AS ENUM ('PRINCIPAL', 'TRADING_PROFIT', 'REFERRAL', 'DEPOSIT_BONUS', 'RANK_BONUS', 'POOL_BONUS');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "RankLevel" AS ENUM ('LV1', 'LV2', 'LV3', 'LV4', 'LV5', 'LV6', 'LV7');

-- CreateEnum
CREATE TYPE "CycleBonusStatus" AS ENUM ('PENDING', 'CREDITED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRADE', 'REFERRAL', 'RANK', 'CYCLE', 'SYSTEM', 'SECURITY');

-- CreateEnum
CREATE TYPE "BlockchainTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "BlockchainTransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "CronJobStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PoolBonusRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PoolBonusRequestType" AS ENUM ('TRANSFER_TO_PRINCIPAL', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "GovIdType" AS ENUM ('AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'REPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "referralCode" TEXT NOT NULL,
    "sponsor_id" TEXT,
    "walletAddress" TEXT,
    "rank" "RankLevel" NOT NULL DEFAULT 'LV1',
    "autoTradeStatus" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'INACTIVE',
    "is_content_creator" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "sponsor_trade_bonus_expiry" TIMESTAMP(3),
    "sponsor_trade_bonus_rate" DOUBLE PRECISION,
    "gov_id_type" "GovIdType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "email_otp" TEXT,
    "email_otp_expires_at" TIMESTAMP(3),
    "email_otp_purpose" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "gov_id_url" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "WalletType" NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_debit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledgers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "reference_id" TEXT,
    "referenceType" "ReferenceType",
    "before_balance" DECIMAL(20,8) NOT NULL,
    "after_balance" DECIMAL(20,8) NOT NULL,
    "credit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "debit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "sender_address" TEXT NOT NULL,
    "receiver_address" TEXT NOT NULL,
    "token_contract" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "block_number" BIGINT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "required_confirmations" INTEGER NOT NULL DEFAULT 12,
    "status" "DepositStatus" NOT NULL,
    "bonus_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "blockchain_data" JSONB,
    "verified_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_type" "WithdrawalWalletType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "fee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "penalty" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(20,8) NOT NULL,
    "destination_address" TEXT NOT NULL,
    "transaction_hash" TEXT,
    "network" TEXT NOT NULL,
    "gas_fee" DECIMAL(20,8),
    "status" "WithdrawalStatus" NOT NULL,
    "admin_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "blockchain_data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trade_amount" DECIMAL(20,8) NOT NULL,
    "profit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "commission" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "status" "TradeStatus" NOT NULL,
    "entry_time" TIMESTAMP(3) NOT NULL,
    "exit_time" TIMESTAMP(3),
    "settlement_time" TIMESTAMP(3),
    "trade_type" "TradeType" NOT NULL,
    "profit_percentage" DECIMAL(5,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_exclusions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sponsor_id" TEXT,
    "level" INTEGER NOT NULL,
    "direct_deposit_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "team_deposit_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "direct_referral_count" INTEGER NOT NULL DEFAULT 0,
    "teamSize" INTEGER NOT NULL DEFAULT 0,
    "total_bonus_earned" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_bonuses" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "deposit_id" TEXT NOT NULL,
    "deposit_amount" DECIMAL(20,8) NOT NULL,
    "bonus_percentage" DECIMAL(5,2) NOT NULL,
    "bonus_amount" DECIMAL(20,8) NOT NULL,
    "level" INTEGER NOT NULL,
    "status" "DepositStatus" NOT NULL,
    "credited_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" "RankLevel" NOT NULL,
    "direct_referrals" INTEGER NOT NULL DEFAULT 0,
    "team_size" INTEGER NOT NULL DEFAULT 0,
    "direct_lv1_count" INTEGER NOT NULL DEFAULT 0,
    "requirements" JSONB,
    "achieved_at" TIMESTAMP(3) NOT NULL,
    "total_rank_bonus_earned" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_cycle_bonus_earned" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rank_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "previous_level" "RankLevel",
    "new_level" "RankLevel" NOT NULL,
    "change_reason" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rank_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_bonuses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rank_id" TEXT NOT NULL,
    "rank_level" "RankLevel" NOT NULL,
    "cycle_number" INTEGER NOT NULL,
    "cycle_start_date" TIMESTAMP(3) NOT NULL,
    "cycle_end_date" TIMESTAMP(3) NOT NULL,
    "rank_bonus_amount" DECIMAL(20,8) NOT NULL,
    "cycle_bonus_amount" DECIMAL(20,8) NOT NULL,
    "total_amount" DECIMAL(20,8) NOT NULL,
    "status" "CycleBonusStatus" NOT NULL,
    "credited_at" TIMESTAMP(3),
    "eligibility_data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_bonus_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_type" "PoolBonusRequestType" NOT NULL,
    "requested_amount" DECIMAL(20,8) NOT NULL,
    "approved_amount" DECIMAL(20,8),
    "status" "PoolBonusRequestStatus" NOT NULL DEFAULT 'PENDING',
    "destination_address" TEXT,
    "network" TEXT,
    "admin_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "admin_note" TEXT,
    "processed_at" TIMESTAMP(3),
    "transaction_hash" TEXT,
    "failure_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pool_bonus_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_transactions" (
    "id" TEXT NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "type" "BlockchainTransactionType" NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "token_contract" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "block_number" BIGINT,
    "confirmations" INTEGER NOT NULL,
    "status" "BlockchainTransactionStatus" NOT NULL,
    "raw_transaction" JSONB,
    "receipt" JSONB,
    "verified_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_logs" (
    "id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "status" "CronJobStatus" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration" INTEGER,
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "author_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "author_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "admin_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_referralCode_idx" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_sponsor_id_idx" ON "users"("sponsor_id");

-- CreateIndex
CREATE INDEX "users_rank_idx" ON "users"("rank");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_autoTradeStatus_idx" ON "users"("autoTradeStatus");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_type_idx" ON "wallets"("type");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_type_key" ON "wallets"("user_id", "type");

-- CreateIndex
CREATE INDEX "ledgers_user_id_idx" ON "ledgers"("user_id");

-- CreateIndex
CREATE INDEX "ledgers_wallet_id_idx" ON "ledgers"("wallet_id");

-- CreateIndex
CREATE INDEX "ledgers_reference_id_idx" ON "ledgers"("reference_id");

-- CreateIndex
CREATE INDEX "ledgers_type_idx" ON "ledgers"("type");

-- CreateIndex
CREATE INDEX "ledgers_createdAt_idx" ON "ledgers"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_transaction_hash_key" ON "deposits"("transaction_hash");

-- CreateIndex
CREATE INDEX "deposits_user_id_idx" ON "deposits"("user_id");

-- CreateIndex
CREATE INDEX "deposits_transaction_hash_idx" ON "deposits"("transaction_hash");

-- CreateIndex
CREATE INDEX "deposits_status_idx" ON "deposits"("status");

-- CreateIndex
CREATE INDEX "deposits_createdAt_idx" ON "deposits"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_transaction_hash_key" ON "withdrawals"("transaction_hash");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_idx" ON "withdrawals"("user_id");

-- CreateIndex
CREATE INDEX "withdrawals_transaction_hash_idx" ON "withdrawals"("transaction_hash");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "withdrawals_wallet_type_idx" ON "withdrawals"("wallet_type");

-- CreateIndex
CREATE INDEX "withdrawals_createdAt_idx" ON "withdrawals"("createdAt");

-- CreateIndex
CREATE INDEX "trades_user_id_idx" ON "trades"("user_id");

-- CreateIndex
CREATE INDEX "trades_status_idx" ON "trades"("status");

-- CreateIndex
CREATE INDEX "trades_entry_time_idx" ON "trades"("entry_time");

-- CreateIndex
CREATE INDEX "trades_trade_type_idx" ON "trades"("trade_type");

-- CreateIndex
CREATE UNIQUE INDEX "trade_exclusions_user_id_key" ON "trade_exclusions"("user_id");

-- CreateIndex
CREATE INDEX "trade_exclusions_user_id_idx" ON "trade_exclusions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_user_id_key" ON "referrals"("user_id");

-- CreateIndex
CREATE INDEX "referrals_user_id_idx" ON "referrals"("user_id");

-- CreateIndex
CREATE INDEX "referrals_sponsor_id_idx" ON "referrals"("sponsor_id");

-- CreateIndex
CREATE INDEX "referrals_level_idx" ON "referrals"("level");

-- CreateIndex
CREATE INDEX "referrals_direct_referral_count_idx" ON "referrals"("direct_referral_count");

-- CreateIndex
CREATE INDEX "referral_bonuses_referral_id_idx" ON "referral_bonuses"("referral_id");

-- CreateIndex
CREATE INDEX "referral_bonuses_user_id_idx" ON "referral_bonuses"("user_id");

-- CreateIndex
CREATE INDEX "referral_bonuses_deposit_id_idx" ON "referral_bonuses"("deposit_id");

-- CreateIndex
CREATE INDEX "referral_bonuses_status_idx" ON "referral_bonuses"("status");

-- CreateIndex
CREATE INDEX "referral_bonuses_createdAt_idx" ON "referral_bonuses"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ranks_user_id_key" ON "ranks"("user_id");

-- CreateIndex
CREATE INDEX "ranks_user_id_idx" ON "ranks"("user_id");

-- CreateIndex
CREATE INDEX "ranks_level_idx" ON "ranks"("level");

-- CreateIndex
CREATE INDEX "ranks_achieved_at_idx" ON "ranks"("achieved_at");

-- CreateIndex
CREATE INDEX "rank_history_user_id_idx" ON "rank_history"("user_id");

-- CreateIndex
CREATE INDEX "rank_history_changed_at_idx" ON "rank_history"("changed_at");

-- CreateIndex
CREATE INDEX "cycle_bonuses_user_id_idx" ON "cycle_bonuses"("user_id");

-- CreateIndex
CREATE INDEX "cycle_bonuses_rank_id_idx" ON "cycle_bonuses"("rank_id");

-- CreateIndex
CREATE INDEX "cycle_bonuses_status_idx" ON "cycle_bonuses"("status");

-- CreateIndex
CREATE INDEX "cycle_bonuses_cycle_start_date_idx" ON "cycle_bonuses"("cycle_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_bonuses_user_id_cycle_number_key" ON "cycle_bonuses"("user_id", "cycle_number");

-- CreateIndex
CREATE INDEX "pool_bonus_requests_user_id_idx" ON "pool_bonus_requests"("user_id");

-- CreateIndex
CREATE INDEX "pool_bonus_requests_status_idx" ON "pool_bonus_requests"("status");

-- CreateIndex
CREATE INDEX "pool_bonus_requests_request_type_idx" ON "pool_bonus_requests"("request_type");

-- CreateIndex
CREATE INDEX "pool_bonus_requests_admin_id_idx" ON "pool_bonus_requests"("admin_id");

-- CreateIndex
CREATE INDEX "pool_bonus_requests_createdAt_idx" ON "pool_bonus_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_transactions_transaction_hash_key" ON "blockchain_transactions"("transaction_hash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_transaction_hash_idx" ON "blockchain_transactions"("transaction_hash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_status_idx" ON "blockchain_transactions"("status");

-- CreateIndex
CREATE INDEX "blockchain_transactions_type_idx" ON "blockchain_transactions"("type");

-- CreateIndex
CREATE INDEX "blockchain_transactions_createdAt_idx" ON "blockchain_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "cron_logs_job_name_idx" ON "cron_logs"("job_name");

-- CreateIndex
CREATE INDEX "cron_logs_status_idx" ON "cron_logs"("status");

-- CreateIndex
CREATE INDEX "cron_logs_start_time_idx" ON "cron_logs"("start_time");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "posts_is_active_idx" ON "posts"("is_active");

-- CreateIndex
CREATE INDEX "posts_sort_order_idx" ON "posts"("sort_order");

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "news_is_active_idx" ON "news"("is_active");

-- CreateIndex
CREATE INDEX "news_sort_order_idx" ON "news"("sort_order");

-- CreateIndex
CREATE INDEX "news_createdAt_idx" ON "news"("createdAt");

-- CreateIndex
CREATE INDEX "news_author_id_idx" ON "news"("author_id");

-- CreateIndex
CREATE INDEX "tickets_user_id_idx" ON "tickets"("user_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_createdAt_idx" ON "tickets"("createdAt");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_messages_sender_id_idx" ON "ticket_messages"("sender_id");

-- CreateIndex
CREATE INDEX "ticket_messages_createdAt_idx" ON "ticket_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_exclusions" ADD CONSTRAINT "trade_exclusions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_bonuses" ADD CONSTRAINT "referral_bonuses_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_bonuses" ADD CONSTRAINT "referral_bonuses_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_bonuses" ADD CONSTRAINT "referral_bonuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranks" ADD CONSTRAINT "ranks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_bonuses" ADD CONSTRAINT "cycle_bonuses_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "ranks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_bonuses" ADD CONSTRAINT "cycle_bonuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_bonus_requests" ADD CONSTRAINT "pool_bonus_requests_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_bonus_requests" ADD CONSTRAINT "pool_bonus_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
