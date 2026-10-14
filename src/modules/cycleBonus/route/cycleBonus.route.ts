import { Router } from 'express';
import { cycleBonusController } from '../controller/cycleBonus.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/cycle-bonus/history
 * @desc    Get current user's cycle bonus history
 * @access  Private
 */
router.get('/history', authenticate, cycleBonusController.getUserCycleBonuses.bind(cycleBonusController));

/**
 * @route   GET /api/v1/cycle-bonus/:id
 * @desc    Get single cycle bonus by ID
 * @access  Private
 */
router.get('/:id', authenticate, cycleBonusController.getById.bind(cycleBonusController));

/**
 * @route   POST /api/v1/cycle-bonus/process
 * @desc    Trigger 10-day cycle bonus distribution (Admin / Cron)
 * @access  Admin
 */
router.post('/process', authenticate, authorize('ADMIN'), cycleBonusController.processCycleBonus.bind(cycleBonusController));

/**
 * @route   GET /api/v1/cycle-bonus/admin/all
 * @desc    Get all cycle bonuses across platform (Admin)
 * @access  Admin
 */
router.get('/admin/all', authenticate, authorize('ADMIN'), cycleBonusController.getAllCycleBonuses.bind(cycleBonusController));

export default router;
