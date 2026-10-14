import { Router } from 'express';
import { ledgerController } from '../controller/ledger.controller';
import { validateQuery } from '../../../middlewares/validation.middleware';
import { getLedgerSchema } from '../validator/ledger.validator';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/ledger
 * @desc    Get user ledger entries
 * @access  Private
 */
router.get('/', authenticate, validateQuery(getLedgerSchema), ledgerController.getUserLedgers.bind(ledgerController));

/**
 * @route   GET /api/v1/ledger/wallet/:walletId
 * @desc    Get wallet ledger entries
 * @access  Private
 */
router.get('/wallet/:walletId', authenticate, validateQuery(getLedgerSchema), ledgerController.getWalletLedgers.bind(ledgerController));

/**
 * @route   GET /api/v1/ledger/:id
 * @desc    Get ledger by ID
 * @access  Private
 */
router.get('/:id', authenticate, ledgerController.getLedgerById.bind(ledgerController));

export default router;
