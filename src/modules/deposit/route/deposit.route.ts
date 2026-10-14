import { Router } from 'express';
import { depositController } from '../controller/deposit.controller';
import { validateRequest, validateQuery } from '../../../middlewares/validation.middleware';
import { createDepositSchema, getDepositSchema } from '../validator/deposit.validator';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/deposit
 * @desc    Create deposit request
 * @access  Private
 */
router.post('/', authenticate, validateRequest(createDepositSchema), depositController.createDeposit.bind(depositController));

/**
 * @route   GET /api/v1/deposit
 * @desc    Get user deposits
 * @access  Private
 */
router.get('/', authenticate, validateQuery(getDepositSchema), depositController.getUserDeposits.bind(depositController));

/**
 * @route   GET /api/v1/deposit/address
 * @desc    Get the platform deposit wallet address (user-facing)
 * @access  Private
 */
router.get('/address', authenticate, depositController.getDepositWalletAddress.bind(depositController));

/**
 * @route   GET /api/v1/deposit/statistics
 * @desc    Get deposit statistics
 * @access  Private
 */
router.get('/statistics', authenticate, depositController.getStatistics.bind(depositController));

/**
 * @route   GET /api/v1/deposit/:id
 * @desc    Get deposit by ID
 * @access  Private
 */
router.get('/:id', authenticate, depositController.getDepositById.bind(depositController));

/**
 * @route   POST /api/v1/deposit/:id/verify
 * @desc    Verify deposit (owner or admin)
 * @access  Private
 */
router.post('/:id/verify', authenticate, depositController.verifyDeposit.bind(depositController));

/**
 * @route   POST /api/v1/deposit/:id/approve
 * @desc    Approve deposit (admin)
 * @access  Admin
 */
router.post('/:id/approve', authenticate, authorize('ADMIN'), depositController.approveDeposit.bind(depositController));

/**
 * @route   POST /api/v1/deposit/:id/reject
 * @desc    Reject deposit (admin)
 * @access  Admin
 */
router.post('/:id/reject', authenticate, authorize('ADMIN'), depositController.rejectDeposit.bind(depositController));

/**
 * @route   GET /api/v1/deposit/admin/all
 * @desc    Get all deposits (admin)
 * @access  Admin
 */
router.get('/admin/all', authenticate, authorize('ADMIN'), validateQuery(getDepositSchema), depositController.getAllDeposits.bind(depositController));

export default router;
