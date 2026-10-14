import { Router } from 'express';
import { blockchainController } from '../controller/blockchain.controller';
import { validateRequest, validateQuery } from '../../../middlewares/validation.middleware';
import { verifyTransactionSchema, getBalanceSchema, getTokenBalanceSchema } from '../validator/blockchain.validator';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/blockchain/verify
 * @desc    Verify blockchain transaction
 * @access  Private
 */
router.post('/verify', authenticate, validateRequest(verifyTransactionSchema), blockchainController.verifyTransaction.bind(blockchainController));

/**
 * @route   GET /api/v1/blockchain/balance
 * @desc    Get wallet balance (native token)
 * @access  Private
 */
router.get('/balance', authenticate, validateQuery(getBalanceSchema), blockchainController.getBalance.bind(blockchainController));

/**
 * @route   GET /api/v1/blockchain/token-balance
 * @desc    Get token balance
 * @access  Private
 */
router.get('/token-balance', authenticate, validateQuery(getTokenBalanceSchema), blockchainController.getTokenBalance.bind(blockchainController));

/**
 * @route   GET /api/v1/blockchain/receipt/:hash
 * @desc    Get transaction receipt
 * @access  Private
 */
router.get('/receipt/:hash', authenticate, blockchainController.getTransactionReceipt.bind(blockchainController));

/**
 * @route   GET /api/v1/blockchain/health
 * @desc    Check network health
 * @access  Private
 */
router.get('/health', authenticate, blockchainController.checkNetworkHealth.bind(blockchainController));

export default router;
