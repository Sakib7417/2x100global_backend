import { Router } from 'express';
import { walletController } from '../controller/wallet.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { transferToPrincipalSchema } from '../validator/wallet.validator';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/wallet/summary
 * @desc    Get wallet summary for user
 * @access  Private
 */
router.get('/summary', authenticate, walletController.getWalletSummary.bind(walletController));

/**
 * @route   POST /api/v1/wallet/transfer
 * @desc    Move a bonus-wallet balance into PRINCIPAL (compounds the
 *          stake; restarts the trade-count penalty baseline)
 * @access  Private
 */
router.post('/transfer', authenticate, validateRequest(transferToPrincipalSchema), walletController.transferToPrincipal.bind(walletController));

/**
 * @route   GET /api/v1/wallet/:type
 * @desc    Get specific wallet by type
 * @access  Private
 */
router.get('/:type', authenticate, walletController.getWallet.bind(walletController));

/**
 * @route   GET /api/v1/wallet/:type/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/:type/balance', authenticate, walletController.getBalance.bind(walletController));

export default router;
