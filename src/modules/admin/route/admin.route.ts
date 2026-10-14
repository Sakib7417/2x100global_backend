import { Router } from 'express';
import { adminController } from '../controller/admin.controller';
import { validateQuery, validateRequest } from '../../../middlewares/validation.middleware';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { listQuerySchema, userActionSchema, updateConfigSchema, updateTradeScheduleSchema, toggleTradingSchema, addTradeExclusionSchema } from '../validator/admin.validator';

const router = Router();

router.get('/dashboard', authenticate, authorize('ADMIN'), adminController.getDashboardStats.bind(adminController));
router.get('/analytics', authenticate, authorize('ADMIN'), adminController.getAnalytics.bind(adminController));
router.get('/users', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listUsers.bind(adminController));
router.get('/users/:userId', authenticate, authorize('ADMIN'), adminController.getUserDetail.bind(adminController));
router.get('/deposits', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listDeposits.bind(adminController));
router.get('/withdrawals', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listWithdrawals.bind(adminController));
router.get('/trades', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listTrades.bind(adminController));
router.get('/wallets', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listWallets.bind(adminController));
router.get('/referrals', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listReferrals.bind(adminController));
router.get('/ranks', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listRanks.bind(adminController));
router.get('/cycle-bonuses', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listCycleBonuses.bind(adminController));
router.get('/blockchain', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listBlockchainTransactions.bind(adminController));
router.get('/notifications', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listNotifications.bind(adminController));
router.get('/audit-logs', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listAuditLogs.bind(adminController));
router.get('/settings', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listSettings.bind(adminController));
router.post('/users/action', authenticate, authorize('ADMIN'), validateRequest(userActionSchema), adminController.manageUser.bind(adminController));
router.put('/config', authenticate, authorize('ADMIN'), validateRequest(updateConfigSchema), adminController.updateConfig.bind(adminController));
router.get('/trade-schedule', authenticate, authorize('ADMIN'), adminController.getTradeSchedule.bind(adminController));
router.put('/trade-schedule', authenticate, authorize('ADMIN'), validateRequest(updateTradeScheduleSchema), adminController.updateTradeSchedule.bind(adminController));

// Global trading on/off and exclusions
router.get('/trading/status', authenticate, authorize('ADMIN'), adminController.getTradingStatus.bind(adminController));
router.put('/trading/toggle', authenticate, authorize('ADMIN'), validateRequest(toggleTradingSchema), adminController.toggleTrading.bind(adminController));
router.get('/trading/exclusions', authenticate, authorize('ADMIN'), validateQuery(listQuerySchema), adminController.listTradeExclusions.bind(adminController));
router.post('/trading/exclusions', authenticate, authorize('ADMIN'), validateRequest(addTradeExclusionSchema), adminController.addTradeExclusion.bind(adminController));
router.delete('/trading/exclusions/:userId', authenticate, authorize('ADMIN'), adminController.removeTradeExclusion.bind(adminController));

// Content creator management
router.get('/content-creators', authenticate, authorize('ADMIN'), adminController.listContentCreators.bind(adminController));
router.put('/users/:userId/content-creator', authenticate, authorize('ADMIN'), adminController.toggleContentCreator.bind(adminController));

export default router;
