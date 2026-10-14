import { Router } from 'express';
import { withdrawalController } from '../controller/withdrawal.controller';
import { validateRequest, validateQuery } from '../../../middlewares/validation.middleware';
import { createWithdrawalSchema, getWithdrawalSchema } from '../validator/withdrawal.validator';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/withdrawal
 * @desc    Create withdrawal request
 * @access  Private
 */
router.post('/', authenticate, validateRequest(createWithdrawalSchema), withdrawalController.createWithdrawal.bind(withdrawalController));

/**
 * @route   GET /api/v1/withdrawal
 * @desc    Get user withdrawals
 * @access  Private
 */
router.get('/', authenticate, validateQuery(getWithdrawalSchema), withdrawalController.getUserWithdrawals.bind(withdrawalController));

/**
 * @route   GET /api/v1/withdrawal/statistics
 * @desc    Get withdrawal statistics
 * @access  Private
 */
router.get('/statistics', authenticate, withdrawalController.getStatistics.bind(withdrawalController));

/**
 * @route   GET /api/v1/withdrawal/:id
 * @desc    Get withdrawal by ID
 * @access  Private
 */
router.get('/:id', authenticate, withdrawalController.getWithdrawalById.bind(withdrawalController));

/**
 * @route   POST /api/v1/withdrawal/:id/process
 * @desc    Process withdrawal (admin)
 * @access  Admin
 */
router.post('/:id/process', authenticate, authorize('ADMIN'), withdrawalController.processWithdrawal.bind(withdrawalController));

/**
 * @route   POST /api/v1/withdrawal/:id/reject
 * @desc    Reject withdrawal (admin)
 * @access  Admin
 */
router.post('/:id/reject', authenticate, authorize('ADMIN'), withdrawalController.rejectWithdrawal.bind(withdrawalController));

/**
 * @route   GET /api/v1/withdrawal/admin/all
 * @desc    Get all withdrawals (admin)
 * @access  Admin
 */
router.get('/admin/all', authenticate, authorize('ADMIN'), validateQuery(getWithdrawalSchema), withdrawalController.getAllWithdrawals.bind(withdrawalController));

export default router;
