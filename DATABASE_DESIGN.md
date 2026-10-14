# Database Design

## Entity Relationship Overview

```
User (1) ----< (N) Wallet
User (1) ----< (N) Ledger
User (1) ----< (N) Deposit
User (1) ----< (N) Withdrawal
User (1) ----< (N) Trade
User (1) ----< (N) Referral (as referred user)
User (1) ----< (N) Referral (as sponsor)
User (1) ----< (N) Rank
User (1) ----< (N) CycleBonus
User (1) ----< (N) Notification
User (1) ----< (N) RefreshToken

Wallet (1) ----< (N) Ledger
Deposit (1) ----< (N) Ledger
Withdrawal (1) ----< (N) Ledger
Trade (1) ----< (N) Ledger
```

## Table Definitions

### 1. Users Table

**Purpose**: Store user account information and authentication data

**Columns**:
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique, Indexed)
- `password` (VARCHAR, Hashed with bcrypt)
- `name` (VARCHAR)
- `phone` (VARCHAR)
- `country` (VARCHAR)
- `referralCode` (VARCHAR, Unique, Indexed)
- `sponsorId` (UUID, Foreign Key to Users.id)
- `walletAddress` (VARCHAR)
- `rank` (ENUM: LV1, LV2, LV3, LV4, LV5, LV6, LV7)
- `autoTradeStatus` (BOOLEAN, Default: false)
- `status` (ENUM: ACTIVE, INACTIVE, SUSPENDED, Default: ACTIVE)
- `lastLogin` (TIMESTAMP)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)
- `deletedAt` (TIMESTAMP, Nullable - Soft Delete)

**Indexes**:
- Primary: `id`
- Unique: `email`, `referralCode`
- Foreign: `sponsorId`
- Performance: `rank`, `status`, `autoTradeStatus`

**Constraints**:
- `email` must be valid email format
- `referralCode` must be unique and 8 characters
- `sponsorId` must reference valid user or null

---

### 2. Wallets Table

**Purpose**: Store wallet balances for different wallet types

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `type` (ENUM: PRINCIPAL, DEPOSIT_BONUS, REFERRAL, TRADING_PROFIT, RANK_BONUS, CYCLE_BONUS, ADMIN_COMMISSION)
- `balance` (DECIMAL(20, 8), Default: 0)
- `totalCredit` (DECIMAL(20, 8), Default: 0)
- `totalDebit` (DECIMAL(20, 8), Default: 0)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Composite: `(userId, type)` - Unique
- Performance: `balance`

**Constraints**:
- `balance` must be >= 0
- Each user can have only one wallet of each type
- `totalCredit` and `totalDebit` must be >= 0

---

### 3. Ledgers Table

**Purpose**: Record all balance changes for accounting and audit trail

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `walletId` (UUID, Foreign Key to Wallets.id)
- `type` (ENUM: DEPOSIT, DEPOSIT_BONUS, REFERRAL_BONUS, TRADE_ENTRY, TRADE_PROFIT, ADMIN_COMMISSION, COMPOUND_TRANSFER, WITHDRAWAL, WITHDRAWAL_FEE, PENALTY, RANK_BONUS, CYCLE_BONUS, REFUND, ADJUSTMENT)
- `referenceId` (UUID, Nullable - References related transaction)
- `referenceType` (ENUM: DEPOSIT, WITHDRAWAL, TRADE, REFERRAL, RANK, CYCLE, Nullable)
- `beforeBalance` (DECIMAL(20, 8))
- `afterBalance` (DECIMAL(20, 8))
- `credit` (DECIMAL(20, 8), Default: 0)
- `debit` (DECIMAL(20, 8), Default: 0)
- `description` (TEXT)
- `metadata` (JSONB, Nullable - Additional data)
- `createdAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`, `walletId`
- Performance: `referenceId`, `type`, `createdAt`
- Composite: `(userId, type)`, `(walletId, createdAt)`

**Constraints**:
- `credit` and `debit` cannot both be positive
- `afterBalance` = `beforeBalance` + `credit` - `debit`
- All amounts must be >= 0

---

### 4. Deposits Table

**Purpose**: Store deposit requests and blockchain verification data

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `amount` (DECIMAL(20, 8))
- `transactionHash` (VARCHAR, Unique, Indexed)
- `senderAddress` (VARCHAR)
- `receiverAddress` (VARCHAR)
- `tokenContract` (VARCHAR)
- `network` (VARCHAR)
- `blockNumber` (BIGINT, Nullable)
- `confirmations` (INT, Default: 0)
- `requiredConfirmations` (INT, Default: 12)
- `status` (ENUM: PENDING, VERIFIED, APPROVED, REJECTED, FAILED)
- `bonusAmount` (DECIMAL(20, 8), Default: 0)
- `blockchainData` (JSONB, Nullable - Complete transaction data)
- `verifiedAt` (TIMESTAMP, Nullable)
- `approvedAt` (TIMESTAMP, Nullable)
- `rejectionReason` (TEXT, Nullable)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Unique: `transactionHash`
- Performance: `status`, `createdAt`, `amount`

**Constraints**:
- `amount` must be >= 50 (minimum deposit)
- `transactionHash` must be unique
- `status` transitions must follow business rules

---

### 5. Withdrawals Table

**Purpose**: Store withdrawal requests and blockchain transaction data

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `walletType` (ENUM: PRINCIPAL, TRADING_PROFIT, REFERRAL, DEPOSIT_BONUS, RANK_BONUS, CYCLE_BONUS)
- `amount` (DECIMAL(20, 8))
- `fee` (DECIMAL(20, 8), Default: 0)
- `penalty` (DECIMAL(20, 8), Default: 0)
- `netAmount` (DECIMAL(20, 8))
- `destinationAddress` (VARCHAR)
- `transactionHash` (VARCHAR, Unique, Nullable)
- `network` (VARCHAR)
- `gasFee` (DECIMAL(20, 8), Nullable)
- `status` (ENUM: PENDING, PROCESSING, COMPLETED, REJECTED, FAILED)
- `adminId` (UUID, Foreign Key to Users.id, Nullable - Admin who processed)
- `processedAt` (TIMESTAMP, Nullable)
- `rejectionReason` (TEXT, Nullable)
- `blockchainData` (JSONB, Nullable)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`, `adminId`
- Unique: `transactionHash` (when not null)
- Performance: `status`, `walletType`, `createdAt`

**Constraints**:
- `amount` must be > 0
- `fee` = 15% of amount
- `penalty` = 40% on PRINCIPAL withdrawals until the user completes 70% of the trade plan (140 of 200 trades)
- `netAmount` = `amount` - `fee` - `penalty`

---

### 6. Trades Table

**Purpose**: Store trading records and profit distribution

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `tradeAmount` (DECIMAL(20, 8))
- `profit` (DECIMAL(20, 8), Default: 0)
- `commission` (DECIMAL(20, 8), Default: 0)
- `status` (ENUM: PENDING, COMPLETED, FAILED)
- `entryTime` (TIMESTAMP)
- `exitTime` (TIMESTAMP, Nullable)
- `settlementTime` (TIMESTAMP, Nullable)
- `tradeType` (ENUM: MORNING, EVENING)
- `profitPercentage` (DECIMAL(5, 2), Nullable)
- `metadata` (JSONB, Nullable)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Performance: `status`, `entryTime`, `tradeType`
- Composite: `(userId, entryTime)`

**Constraints**:
- `tradeAmount` = 1% of principal wallet balance
- `profit` distribution: 60% to user, 40% to admin
- `commission` = 40% of profit
- Trade duration: 2 minutes

---

### 7. Referrals Table

**Purpose**: Store referral relationships and bonus calculations

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id - Referred user)
- `sponsorId` (UUID, Foreign Key to Users.id - Sponsor)
- `level` (INT - Depth in referral tree)
- `directDepositAmount` (DECIMAL(20, 8), Default: 0)
- `teamDepositAmount` (DECIMAL(20, 8), Default: 0)
- `directReferralCount` (INT, Default: 0)
- `teamSize` (INT, Default: 0)
- `totalBonusEarned` (DECIMAL(20, 8), Default: 0)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`, `sponsorId`
- Composite: `(sponsorId, level)`
- Performance: `level`, `directReferralCount`

**Constraints**:
- `level` must be >= 1
- `sponsorId` cannot be null
- A user cannot be their own sponsor

---

### 8. ReferralBonuses Table

**Purpose**: Store individual referral bonus transactions

**Columns**:
- `id` (UUID, Primary Key)
- `referralId` (UUID, Foreign Key to Referrals.id)
- `userId` (UUID, Foreign Key to Users.id - Bonus recipient)
- `depositId` (UUID, Foreign Key to Deposits.id)
- `depositAmount` (DECIMAL(20, 8))
- `bonusPercentage` (DECIMAL(5, 2))
- `bonusAmount` (DECIMAL(20, 8))
- `level` (INT)
- `status` (ENUM: PENDING, CREDITED, FAILED)
- `creditedAt` (TIMESTAMP, Nullable)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `referralId`, `userId`, `depositId`
- Performance: `status`, `createdAt`

**Constraints**:
- `bonusPercentage`: 5% for 50-999 USDT, 10% for 1000-9999 USDT
- `bonusAmount` = `depositAmount` * `bonusPercentage` / 100

---

### 9. Ranks Table

**Purpose**: Store user rank achievements and history

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `level` (ENUM: LV1, LV2, LV3, LV4, LV5, LV6, LV7)
- `directReferrals` (INT, Default: 0)
- `teamSize` (INT, Default: 0)
- `directLv1Count` (INT, Default: 0)
- `requirements` (JSONB - Store requirements at time of achievement)
- `achievedAt` (TIMESTAMP)
- `totalRankBonusEarned` (DECIMAL(20, 8), Default: 0)
- `totalCycleBonusEarned` (DECIMAL(20, 8), Default: 0)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Composite: `(userId, level)` - Unique
- Performance: `level`, `achievedAt`

**Constraints**:
- Ranks never downgrade
- Each user has one current rank record per level

---

### 10. RankHistory Table

**Purpose**: Track rank changes over time

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `previousLevel` (ENUM: LV1, LV2, LV3, LV4, LV5, LV6, LV7, Nullable)
- `newLevel` (ENUM: LV1, LV2, LV3, LV4, LV5, LV6, LV7)
- `changeReason` (TEXT)
- `changedAt` (TIMESTAMP)
- `createdAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Performance: `changedAt`

---

### 11. CycleBonuses Table

**Purpose**: Store cycle bonus distributions

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `rankId` (UUID, Foreign Key to Ranks.id)
- `rankLevel` (ENUM: LV1, LV2, LV3, LV4, LV5, LV6, LV7)
- `cycleNumber` (INT)
- `cycleStartDate` (DATE)
- `cycleEndDate` (DATE)
- `rankBonusAmount` (DECIMAL(20, 8))
- `cycleBonusAmount` (DECIMAL(20, 8))
- `totalAmount` (DECIMAL(20, 8))
- `status` (ENUM: PENDING, CREDITED, FAILED)
- `creditedAt` (TIMESTAMP, Nullable)
- `eligibilityData` (JSONB, Nullable)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`, `rankId`
- Composite: `(userId, cycleNumber)` - Unique
- Performance: `status`, `cycleStartDate`

**Constraints**:
- Cycle duration: 10 days
- Bonus amounts based on rank level

---

### 12. RefreshTokens Table

**Purpose**: Store refresh tokens for authentication

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `token` (VARCHAR, Unique, Indexed)
- `expiresAt` (TIMESTAMP)
- `createdAt` (TIMESTAMP)
- `revokedAt` (TIMESTAMP, Nullable)
- `revokedReason` (VARCHAR, Nullable)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Unique: `token`
- Performance: `expiresAt`

**Constraints**:
- `token` must be unique
- Revoked tokens cannot be used

---

### 13. PasswordResetTokens Table

**Purpose**: Store password reset tokens

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `token` (VARCHAR, Unique, Indexed)
- `expiresAt` (TIMESTAMP)
- `usedAt` (TIMESTAMP, Nullable)
- `createdAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Unique: `token`
- Performance: `expiresAt`

**Constraints**:
- `token` must be unique
- Used tokens cannot be reused

---

### 14. Notifications Table

**Purpose**: Store user notifications

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id)
- `type` (ENUM: DEPOSIT, WITHDRAWAL, TRADE, REFERRAL, RANK, CYCLE, SYSTEM, SECURITY)
- `title` (VARCHAR)
- `message` (TEXT)
- `data` (JSONB, Nullable)
- `read` (BOOLEAN, Default: false)
- `readAt` (TIMESTAMP, Nullable)
- `createdAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Performance: `type`, `read`, `createdAt`
- Composite: `(userId, read)`

---

### 15. Settings Table

**Purpose**: Store system-wide configuration

**Columns**:
- `id` (UUID, Primary Key)
- `key` (VARCHAR, Unique, Indexed)
- `value` (TEXT)
- `description` (TEXT)
- `category` (VARCHAR)
- `updatedAt` (TIMESTAMP)
- `updatedBy` (UUID, Foreign Key to Users.id, Nullable)

**Indexes**:
- Primary: `id`
- Unique: `key`
- Performance: `category`

**Constraints**:
- `key` must be unique
- Settings are global

---

### 16. BlockchainTransactions Table

**Purpose**: Store all blockchain transactions for audit

**Columns**:
- `id` (UUID, Primary Key)
- `transactionHash` (VARCHAR, Unique, Indexed)
- `type` (ENUM: DEPOSIT, WITHDRAWAL)
- `fromAddress` (VARCHAR)
- `toAddress` (VARCHAR)
- `amount` (DECIMAL(20, 8))
- `tokenContract` (VARCHAR)
- `network` (VARCHAR)
- `blockNumber` (BIGINT)
- `confirmations` (INT)
- `status` (ENUM: PENDING, CONFIRMED, FAILED)
- `rawTransaction` (JSONB)
- `receipt` (JSONB, Nullable)
- `verifiedAt` (TIMESTAMP, Nullable)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Unique: `transactionHash`
- Performance: `status`, `type`, `createdAt`

---

### 17. CronLogs Table

**Purpose**: Store cron job execution logs

**Columns**:
- `id` (UUID, Primary Key)
- `jobName` (VARCHAR)
- `status` (ENUM: SUCCESS, FAILED, PARTIAL)
- `startTime` (TIMESTAMP)
- `endTime` (TIMESTAMP, Nullable)
- `duration` (INT, Nullable - in milliseconds)
- `recordsProcessed` (INT, Default: 0)
- `recordsFailed` (INT, Default: 0)
- `errorMessage` (TEXT, Nullable)
- `metadata` (JSONB, Nullable)
- `createdAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Performance: `jobName`, `status`, `startTime`
- Composite: `(jobName, startTime)`

---

### 18. AuditLogs Table

**Purpose**: Store audit trail for security

**Columns**:
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users.id, Nullable)
- `action` (VARCHAR)
- `entity` (VARCHAR)
- `entityId` (UUID, Nullable)
- `changes` (JSONB, Nullable)
- `ipAddress` (VARCHAR, Nullable)
- `userAgent` (TEXT, Nullable)
- `createdAt` (TIMESTAMP)

**Indexes**:
- Primary: `id`
- Foreign: `userId`
- Performance: `action`, `entity`, `createdAt`
- Composite: `(userId, createdAt)`

---

## Database Relationships

### User Relationships
- User → Wallets: One-to-Many
- User → Ledgers: One-to-Many
- User → Deposits: One-to-Many
- User → Withdrawals: One-to-Many
- User → Trades: One-to-Many
- User → Referrals (as sponsor): One-to-Many
- User → Referrals (as referred): One-to-One
- User → Ranks: One-to-Many
- User → CycleBonuses: One-to-Many
- User → Notifications: One-to-Many
- User → RefreshTokens: One-to-Many
- User → PasswordResetTokens: One-to-Many

### Wallet Relationships
- Wallet → Ledgers: One-to-Many
- Wallet → User: Many-to-One

### Deposit Relationships
- Deposit → User: Many-to-One
- Deposit → ReferralBonuses: One-to-Many

### Trade Relationships
- Trade → User: Many-to-One
- Trade → Ledgers: One-to-Many

### Referral Relationships
- Referral → User (referred): Many-to-One
- Referral → User (sponsor): Many-to-One
- Referral → ReferralBonuses: One-to-Many

## Performance Optimization

### Indexes Strategy
1. **Primary Keys**: All tables have UUID primary keys
2. **Foreign Keys**: All foreign keys are indexed
3. **Unique Constraints**: Email, referral code, transaction hashes
4. **Composite Indexes**: Frequently queried column combinations
5. **Partial Indexes**: For filtered queries (e.g., active users only)

### Partitioning Strategy
1. **Ledgers**: Partition by month (createdAt)
2. **Trades**: Partition by month (entryTime)
3. **AuditLogs**: Partition by month (createdAt)
4. **CronLogs**: Partition by month (createdAt)

### Query Optimization
1. Use connection pooling
2. Implement read replicas for reporting
3. Use materialized views for complex aggregations
4. Cache frequently accessed data in Redis

## Data Integrity

### Constraints
1. Foreign key constraints ensure referential integrity
2. Check constraints ensure business rules
3. Unique constraints prevent duplicates
4. Not null constraints ensure required fields

### Triggers
1. Update `updatedAt` timestamp on row modification
2. Calculate wallet balances from ledger entries
3. Maintain referral tree statistics
4. Track rank changes in history

## Backup Strategy
1. Daily full backups
2. Continuous WAL archiving
3. Point-in-time recovery capability
4. Backup retention: 30 days
