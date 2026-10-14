# 2x100 Global Backend

Production-ready backend for a 2x100 Global Auto-Trading, Referral & Reward Platform.

## Tech Stack

- **Runtime:** Node.js (Latest LTS)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (Access + Refresh tokens), bcrypt
- **Blockchain:** ethers.js v6
- **Network:** BNB Smart Chain Testnet
- **Caching:** Redis
- **Validation:** Zod
- **Logging:** Winston
- **Scheduling:** node-cron
- **Documentation:** Swagger OpenAPI
- **Containerization:** Docker & Docker Compose

## Architecture

```
src/
├── config/          # Application configuration
├── middlewares/     # Express middleware
├── modules/         # Domain modules (auth, users, wallet, deposit, trade, etc.)
├── prisma/          # Singleton Prisma client
├── routes/          # Route exports
├── tests/           # Unit & integration tests
├── utils/           # Shared utilities
├── index.ts         # Application entry point
```

Each module follows the **Repository Pattern** and uses **Service-Controller** layers with **Dependency Injection** where appropriate.

## Features

- JWT Authentication & Role-Based Authorization
- User Profile & Referral System
- Multi-Wallet Ledger-Based Accounting
- Automated Blockchain Deposit Verification
- Auto Trading Engine with 1% Principal Trades
- Rank & Cycle Bonus Distribution
- Withdrawal with Fee & Early Penalty
- Cron-Scheduled Jobs
- Admin Panel APIs
- Notifications & Audit Logs
- Swagger API Documentation

## Quick Start

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `.env` with your database, Redis, blockchain, and email settings.

4. Run Prisma migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. Start development server:

```bash
npm run dev
```

6. Access API docs at: `http://localhost:3000/api/v1/docs`

### Docker

```bash
docker-compose up -d
docker-compose --profile migrate run --rm migrate
```

## Scripts

- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled application
- `npm run dev` - Run with ts-node-dev
- `npm run test` - Run Jest tests with coverage
- `npm run lint` - Run ESLint
- `npm run prisma:migrate` - Run Prisma migrations
- `npm run prisma:studio` - Open Prisma Studio

## API Documentation

Swagger UI is available at `/api/v1/docs` when the server is running.

## Security

- Helmet for secure headers
- CORS configuration
- Rate limiting
- Zod input validation
- bcrypt password hashing
- JWT refresh token rotation
- XSS & SQL injection protection via parameterized queries

## License

MIT
