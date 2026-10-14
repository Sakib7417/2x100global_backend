import { Router } from 'express';
import { userController } from '../controller/user.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { updateProfileSchema, listUsersSchema, setWithdrawPasswordSchema } from '../validator/user.validator';

const router = Router();

router.get('/profile', authenticate, userController.getProfile.bind(userController));
router.put('/profile', authenticate, validateRequest(updateProfileSchema), userController.updateProfile.bind(userController));
router.get('/dashboard', authenticate, userController.getDashboard.bind(userController));
router.post('/auto-trade/toggle', authenticate, userController.toggleAutoTrade.bind(userController));
router.post('/withdraw-password', authenticate, validateRequest(setWithdrawPasswordSchema), userController.setWithdrawPassword.bind(userController));
router.get('/', authenticate, authorize('ADMIN'), validateRequest(listUsersSchema), userController.listUsers.bind(userController));

export default router;
