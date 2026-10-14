import { Request, Response, NextFunction } from 'express';
import { authService } from '../service/auth.service';
import { SignupInput, LoginInput, RefreshTokenInput, ForgotPasswordInput, ResetPasswordInput, ChangePasswordInput, VerifyEmailInput, ResendOtpInput } from '../validator/auth.validator';
import { uploadToR2, R2_BUCKETS } from '../../../config/storage';

export class AuthController {
  /**
   * Signup user. A government ID photo may optionally be attached; when
   * present it is uploaded to Cloudflare R2 and the public URL persisted.
   */
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const govIdFile = files?.govId?.[0];

      const govIdUrl = govIdFile ? await uploadToR2(govIdFile, R2_BUCKETS.KYC) : undefined;

      const data: SignupInput & { govIdUrl?: string } = {
        ...req.body,
        govIdUrl,
      };

      const result = await authService.signup(data);
      res.status(201).json({
        success: true,
        message: 'Account created successfully. You can now login.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: LoginInput = req.body;
      const result = await authService.login(data);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: RefreshTokenInput = req.body;
      const tokens = await authService.refreshTokens(data.refreshToken);
      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      await authService.logout(userId);
      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: VerifyEmailInput = req.body;
      const result = await authService.verifyEmail(data.email, data.otp);
      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend email OTP
   */
  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: ResendOtpInput = req.body;
      await authService.resendOtp(data.email, data.purpose ?? 'SIGNUP');
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification code has been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: ForgotPasswordInput = req.body;
      await authService.forgotPassword(data.email);
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: ResetPasswordInput = req.body;
      await authService.resetPassword(data.email, data.otp, data.newPassword);
      res.status(200).json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const data: ChangePasswordInput = req.body;
      await authService.changePassword(userId, data.oldPassword, data.newPassword);
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

}

export const authController = new AuthController();
