import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Load environment variables
dotenv.config();

/**
 * BigInt JSON serialisation.
 *
 * `Deposit.blockNumber` and `BlockchainTransaction.blockNumber` are Prisma
 * BigInt columns. `JSON.stringify` has no built-in handling for BigInt and
 * throws `TypeError: Do not know how to serialize a BigInt`, so any endpoint
 * returning a deposit whose blockNumber had been populated by the verification
 * cron would 500 — including GET /deposits, the user's own deposit history.
 *
 * Serialising as a string (not a number) is deliberate: block numbers can
 * exceed Number.MAX_SAFE_INTEGER, and silently rounding a chain identifier
 * would be worse than the crash it replaces.
 *
 * Installed before any route is registered so it covers every response path.
 */
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint
) {
  return this.toString();
};

// Import middleware
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { generalRateLimiter } from './middlewares/rateLimiter.middleware';

// Import routes
import authRoutes from './modules/auth/route/auth.route';
import userRoutes from './modules/users/route/user.route';
import walletRoutes from './modules/wallet/route/wallet.route';
import ledgerRoutes from './modules/ledger/route/ledger.route';
import depositRoutes from './modules/deposit/route/deposit.route';
import withdrawalRoutes from './modules/withdrawal/route/withdrawal.route';
import tradingRoutes from './modules/trading/route/trading.route';
import referralRoutes from './modules/referral/route/referral.route';
import rankRoutes from './modules/rank/route/rank.route';
import cycleBonusRoutes from './modules/cycleBonus/route/cycleBonus.route';
import poolBonusRoutes from './modules/poolBonus/route/poolBonus.route';
import contentRoutes from './modules/content/route/content.route';
import ticketRoutes from './modules/ticket/route/ticket.route';
import blockchainRoutes from './modules/blockchain/route/blockchain.route';
import notificationRoutes from './modules/notifications/route/notification.route';
import settingsRoutes from './modules/settings/route/settings.route';
import adminRoutes from './modules/admin/route/admin.route';

// Cron scheduler
import { cronService } from './modules/cron/cron.service';

// Initialize express app
const app: Application = express();

/**
 * Trust the reverse proxy in front of us.
 *
 * express-rate-limit derives its bucket key from `req.ip`. Without this,
 * `req.ip` is the socket address — which, behind the Next.js BFF proxy, a load
 * balancer or any CDN, is a single upstream address shared by every user. The
 * effect is that the global 100-requests-per-15-minutes limit applies to the
 * ENTIRE PLATFORM as one client rather than per user.
 *
 * `1` means "trust exactly one proxy hop" and take the last entry of
 * X-Forwarded-For. Do not use `true`: that trusts the whole chain, letting a
 * client spoof its own X-Forwarded-For and evade rate limiting entirely.
 * Increase the number if you add further proxy hops in front of this one.
 */
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files — serve uploaded post images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rate limiting — skip in development to avoid the dashboard's burst of
// stats requests tripping the 100/15min global limit on every page load.
if (process.env.NODE_ENV !== 'development') {
  app.use(generalRateLimiter);
}

// API routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: process.env.SWAGGER_TITLE || '2x100 Global API',
      version: process.env.SWAGGER_VERSION || '1.0.0',
      description: process.env.SWAGGER_DESCRIPTION || '2x100 Global Auto-Trading, Referral & Reward Platform',
      contact: {
        email: process.env.SWAGGER_CONTACT_EMAIL || 'support@2x100global.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}${apiPrefix}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/modules/**/*.route.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use(`${apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get(`${apiPrefix}/health`, (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/wallets`, walletRoutes);
app.use(`${apiPrefix}/ledgers`, ledgerRoutes);
app.use(`${apiPrefix}/deposits`, depositRoutes);
app.use(`${apiPrefix}/withdrawals`, withdrawalRoutes);
app.use(`${apiPrefix}/trades`, tradingRoutes);
app.use(`${apiPrefix}/referrals`, referralRoutes);
app.use(`${apiPrefix}/ranks`, rankRoutes);
app.use(`${apiPrefix}/cycle-bonuses`, cycleBonusRoutes);
app.use(`${apiPrefix}/pool-bonus`, poolBonusRoutes);
app.use(`${apiPrefix}/content`, contentRoutes);
app.use(`${apiPrefix}/tickets`, ticketRoutes);
app.use(`${apiPrefix}/blockchain`, blockchainRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/settings`, settingsRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}${apiPrefix}/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}${apiPrefix}/health`);

  // Start scheduled jobs
  cronService.startAll();
});

export default app;
