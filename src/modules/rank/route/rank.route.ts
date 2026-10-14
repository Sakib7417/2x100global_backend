import { Router } from 'express';
import { rankController } from '../controller/rank.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/rank/current
 * @desc    Get current user rank and history
 * @access  Private
 */
router.get('/current', authenticate, rankController.getCurrentRank.bind(rankController));

/**
 * @route   POST /api/v1/rank/evaluate
 * @desc    Evaluate current user rank
 * @access  Private
 */
router.post('/evaluate', authenticate, rankController.evaluateRank.bind(rankController));

export default router;
