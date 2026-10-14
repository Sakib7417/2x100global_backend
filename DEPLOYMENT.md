# Deployment Guide

This guide covers deployment of the 2x100 Global Backend using Docker and manual methods.

## Prerequisites

- Node.js >= 18
- PostgreSQL 14+
- Redis 7+
- BNB Smart Chain Testnet wallet with BNB for gas
- Domain name (for production)
- SSL certificate (for production)

## Environment Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Update the following critical variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` - Generate strong random strings
- `BLOCKCHAIN_RPC_URL` - Reliable BSC Testnet RPC
- `USDT_CONTRACT_ADDRESS` - Keep the testnet address
- `DEPOSIT_WALLET_ADDRESS` - Your platform deposit wallet
- `PRIVATE_KEY` - Hot wallet private key for admin withdrawals (store securely)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Default admin credentials (change after first login)

## Docker Deployment

### 1. Build and start services

```bash
docker-compose up -d --build
```

### 2. Run database migrations

```bash
docker-compose --profile migrate run --rm migrate
```

### 3. Verify running containers

```bash
docker-compose ps
```

### 4. View logs

```bash
docker-compose logs -f app
```

## Manual Deployment

1. Install dependencies:

```bash
npm ci
```

2. Generate Prisma client:

```bash
npx prisma generate
npx prisma migrate deploy
```

3. Build application:

```bash
npm run build
```

4. Start server:

```bash
npm start
```

## Production Recommendations

- Use a process manager like PM2 or systemd
- Configure Nginx reverse proxy with SSL
- Use managed PostgreSQL and Redis services
- Store private keys in a secrets manager (e.g., AWS Secrets Manager, Azure Key Vault)
- Enable automated backups for PostgreSQL
- Use a monitoring solution (e.g., Sentry, Datadog, Prometheus/Grafana)
- Set up log rotation for Winston logs
- Use a dedicated firewall and rate limiting

## Post-Deployment

1. Create the first admin user or use the seeded admin credentials
2. Configure deposit wallet address in settings
3. Verify blockchain connectivity
4. Test deposit, trade, and withdrawal flows
5. Review Swagger docs at `/api/v1/docs`

## Rollback

To rollback a deployment:

```bash
docker-compose down
docker-compose up -d --build previous-image-name
```
