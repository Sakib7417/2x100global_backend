import { Router } from 'express';
import { referralController } from '../controller/referral.controller';
import { validateRequest, validateQuery } from '../../../middlewares/validation.middleware';
import { validateReferralCodeSchema, getReferralTreeSchema, getReferralBonusesSchema } from '../validator/referral.validator';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/referral/validate
 * @desc    Validate referral code
 * @access  Public
 */
router.post('/validate', validateRequest(validateReferralCodeSchema), referralController.validateReferralCode.bind(referralController));

/**
 * @route   GET /api/v1/referral/tree
 * @desc    Get referral tree
 * @access  Private
 */
router.get('/tree', authenticate, validateQuery(getReferralTreeSchema), referralController.getReferralTree.bind(referralController));

/**
 * @route   GET /api/v1/referral/referrals
 * @desc    Get user referrals
 * @access  Private
 */
router.get('/referrals', authenticate, referralController.getUserReferrals.bind(referralController));

/**
 * @route   GET /api/v1/referral/bonuses
 * @desc    Get referral bonuses
 * @access  Private
 */
router.get('/bonuses', authenticate, validateQuery(getReferralBonusesSchema), referralController.getUserBonuses.bind(referralController));

/**
 * @route   GET /api/v1/referral/statistics
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/statistics', authenticate, referralController.getStatistics.bind(referralController));

/**
 * @route   GET /api/v1/referral/link
 * @desc    Get referral link
 * @access  Private
 */
router.get('/link', authenticate, referralController.getReferralLink.bind(referralController));

export default router;
