import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authController } from '../controller/auth.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { signupSchema, loginSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, verifyEmailSchema, resendOtpSchema } from '../validator/auth.validator';
import { authenticate } from '../../../middlewares/auth.middleware';
import { authRateLimiter } from '../../../middlewares/rateLimiter.middleware';
import { KYC_MAX_FILE_SIZE } from '../constants/auth.constants';

const router = Router();

// Multer config for KYC document uploads (government ID front + back).
// Files are kept in memory and uploaded directly to Cloudinary by the
// controller — nothing is written to disk.
const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: KYC_MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  },
});

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register a new user with government ID photo
 * @access  Public
 */
router.post(
  '/signup',
  kycUpload.fields([
    { name: 'govId', maxCount: 1 },
  ]),
  validateRequest(signupSchema),
  authController.signup.bind(authController),
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login.bind(authController));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authRateLimiter, validateRequest(refreshTokenSchema), authController.refreshTokens.bind(authController));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post('/verify-email', authRateLimiter, validateRequest(verifyEmailSchema), authController.verifyEmail.bind(authController));

/**
 * @route   POST /api/v1/auth/resend-otp
 * @desc    Resend email OTP
 * @access  Public
 */
router.post('/resend-otp', authRateLimiter, validateRequest(resendOtpSchema), authController.resendOtp.bind(authController));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authRateLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword.bind(authController));

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authRateLimiter, validateRequest(resetPasswordSchema), authController.resetPassword.bind(authController));

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), authController.changePassword.bind(authController));

export default router;
