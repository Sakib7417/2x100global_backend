import { Router } from 'express';
import { tradingController } from '../controller/trading.controller';
import { validateRequest, validateQuery } from '../../../middlewares/validation.middleware';
import { triggerTradeSchema, submitTradeCodeSchema, getTradeSchema } from '../validator/trading.validator';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/trading/history
 * @desc    Get current user's trade history
 * @access  Private
 */
router.get('/history', authenticate, validateQuery(getTradeSchema), tradingController.getUserTrades.bind(tradingController));

/**
 * @route   GET /api/v1/trading/stats
 * @desc    Get trade statistics for user
 * @access  Private
 */
router.get('/stats', authenticate, tradingController.getStatistics.bind(tradingController));

/**
 * @route   GET /api/v1/trading/recent
 * @desc    Get recent completed trades (public activity feed)
 * @access  Private
 */
router.get('/recent', authenticate, tradingController.getRecentTrades.bind(tradingController));

/**
 * @route   GET /api/v1/trading/active-session
 * @desc    Get the live trade session code + remaining window for the user
 * @access  Private
 */
router.get('/active-session', authenticate, tradingController.getActiveSession.bind(tradingController));

/**
 * @route   POST /api/v1/trading/submit-code
 * @desc    Submit the session code to execute this window's trade
 * @access  Private
 */
router.post('/submit-code', authenticate, validateRequest(submitTradeCodeSchema), tradingController.submitTradeCode.bind(tradingController));

/**
 * @route   GET /api/v1/trading/:id
 * @desc    Get single trade by ID
 * @access  Private
 */
router.get('/:id', authenticate, tradingController.getTradeById.bind(tradingController));



/**
 * @route   POST /api/v1/trading/execute-session
 * @desc    Trigger auto-trading session execution (Admin / Cron)
 * @access  Admin
 */
router.post('/execute-session', authenticate, authorize('ADMIN'), validateRequest(triggerTradeSchema), tradingController.triggerTradeSession.bind(tradingController));

/**
 * @route   POST /api/v1/trading/settle
 * @desc    Settle pending trades (Admin / Cron)
 * @access  Admin
 */
router.post('/settle', authenticate, authorize('ADMIN'), tradingController.settlePendingTrades.bind(tradingController));

/**
 * @route   GET /api/v1/trading/admin/all
 * @desc    Get all trades across platform (Admin)
 * @access  Admin
 */
router.get('/admin/all', authenticate, authorize('ADMIN'), validateQuery(getTradeSchema), tradingController.getAllTrades.bind(tradingController));

export default router;
