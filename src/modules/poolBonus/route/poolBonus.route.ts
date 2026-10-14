import { Router } from 'express';
import { poolBonusController } from '../controller/poolBonus.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import {
  createPoolBonusRequestSchema,
  approvePoolBonusRequestSchema,
  updatePoolBonusRequestSchema,
  rejectPoolBonusRequestSchema,
} from '../validator/poolBonus.validator';

const router = Router();

// ===== User Routes =====

/**
 * @route   POST /api/v1/pool-bonus/request
 * @desc    Create pool bonus withdrawal request
 * @access  Private
 */
router.post('/request', authenticate, validateRequest(createPoolBonusRequestSchema), poolBonusController.createRequest.bind(poolBonusController));

/**
 * @route   GET /api/v1/pool-bonus/requests
 * @desc    Get user's pool bonus requests
 * @access  Private
 */
router.get('/requests', authenticate, poolBonusController.getMyRequests.bind(poolBonusController));

/**
 * @route   GET /api/v1/pool-bonus/requests/:id
 * @desc    Get single pool bonus request
 * @access  Private
 */
router.get('/requests/:id', authenticate, poolBonusController.getMyRequestById.bind(poolBonusController));

/**
 * @route   DELETE /api/v1/pool-bonus/requests/:id
 * @desc    Cancel pending pool bonus request
 * @access  Private
 */
router.delete('/requests/:id', authenticate, poolBonusController.cancelRequest.bind(poolBonusController));

// ===== Admin Routes =====

/**
 * @route   GET /api/v1/pool-bonus/admin/requests
 * @desc    Get all pool bonus requests (admin)
 * @access  Admin
 */
router.get('/admin/requests', authenticate, authorize('ADMIN'), poolBonusController.getAllRequests.bind(poolBonusController));

/**
 * @route   GET /api/v1/pool-bonus/admin/requests/:id
 * @desc    Get single pool bonus request (admin)
 * @access  Admin
 */
router.get('/admin/requests/:id', authenticate, authorize('ADMIN'), poolBonusController.getAdminRequestById.bind(poolBonusController));

/**
 * @route   PUT /api/v1/pool-bonus/admin/requests/:id/approve
 * @desc    Approve pool bonus request (admin)
 * @access  Admin
 */
router.put('/admin/requests/:id/approve', authenticate, authorize('ADMIN'), validateRequest(approvePoolBonusRequestSchema), poolBonusController.approveRequest.bind(poolBonusController));

/**
 * @route   PUT /api/v1/pool-bonus/admin/requests/:id/update
 * @desc    Update amount and approve pool bonus request (admin)
 * @access  Admin
 */
router.put('/admin/requests/:id/update', authenticate, authorize('ADMIN'), validateRequest(updatePoolBonusRequestSchema), poolBonusController.updateAndApproveRequest.bind(poolBonusController));

/**
 * @route   PUT /api/v1/pool-bonus/admin/requests/:id/reject
 * @desc    Reject pool bonus request (admin)
 * @access  Admin
 */
router.put('/admin/requests/:id/reject', authenticate, authorize('ADMIN'), validateRequest(rejectPoolBonusRequestSchema), poolBonusController.rejectRequest.bind(poolBonusController));

export default router;
