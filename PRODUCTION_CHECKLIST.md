# Production Checklist

## Infrastructure

- [ ] Use managed PostgreSQL (e.g., AWS RDS, Cloud SQL)
- [ ] Use managed Redis (e.g., AWS ElastiCache, Redis Cloud)
- [ ] Configure SSL/TLS certificates
- [ ] Set up Nginx or Load Balancer with HTTPS
- [ ] Enable DDoS and WAF protection
- [ ] Configure automated database backups
- [ ] Set up log aggregation and monitoring
- [ ] Configure CI/CD pipeline for automated deployments

## Security

- [ ] Rotate all default secrets (JWT, admin password, email)
- [ ] Store private keys in a secrets manager
- [ ] Enable CORS for trusted origins only
- [ ] Configure strict rate limits
- [ ] Review and tighten Helmet headers
- [ ] Implement IP allowlisting for admin panel
- [ ] Conduct dependency vulnerability scan (`npm audit`)
- [ ] Enable SQL injection and XSS protections

## Blockchain

- [ ] Verify BNB Smart Chain Testnet contract address
- [ ] Test deposit verification with real transactions
- [ ] Confirm deposit wallet address matches configured value
- [ ] Test withdrawal flow end-to-end
- [ ] Monitor gas prices and wallet balance
- [ ] Implement multi-signature for large withdrawals (recommended)

## Application

- [ ] Run `npm run build` successfully
- [ ] Run full test suite with `npm test`
- [ ] Run database migrations in production
- [ ] Seed default settings and admin account
- [ ] Verify all cron jobs are scheduled and logging
- [ ] Confirm Swagger documentation is accessible
- [ ] Test all user flows (signup, deposit, trade, withdrawal)
- [ ] Verify ledger entries are created for every transaction

## Operations

- [ ] Set up health checks and uptime monitoring
- [ ] Configure alerts for failed cron jobs
- [ ] Set up log rotation for `logs/` directory
- [ ] Document incident response procedures
- [ ] Prepare runbook for manual intervention
- [ ] Perform disaster recovery drill
- [ ] Monitor server resource usage (CPU, memory, disk)

## Compliance

- [ ] Implement audit logging for admin actions
- [ ] Ensure data retention policies are documented
- [ ] Verify KYC/AML flow if required by jurisdiction
- [ ] Add terms of service and privacy policy

## Final Verification

- [ ] All environment variables are set and validated
- [ ] Application starts without errors
- [ ] API endpoints return expected responses
- [ ] Blockchain transactions are verified correctly
- [ ] Cron jobs run on schedule
