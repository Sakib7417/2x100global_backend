import { Router } from 'express';
import { settingsController } from '../controller/settings.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { createSettingSchema, updateSettingSchema } from '../validator/settings.validator';

const router = Router();

router.get('/', authenticate, settingsController.getAll.bind(settingsController));
router.get('/:key', authenticate, settingsController.getByKey.bind(settingsController));
router.post('/', authenticate, authorize('ADMIN'), validateRequest(createSettingSchema), settingsController.create.bind(settingsController));
router.put('/:key', authenticate, authorize('ADMIN'), validateRequest(updateSettingSchema), settingsController.update.bind(settingsController));
router.post('/seed', authenticate, authorize('ADMIN'), settingsController.seed.bind(settingsController));

export default router;
