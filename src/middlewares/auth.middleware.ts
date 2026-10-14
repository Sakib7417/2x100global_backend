import { Request, Response, NextFunction } from 'express';
import { authService } from '../modules/auth/service/auth.service';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    isContentCreator?: boolean;
  };
}

/**
 * Authenticate user with JWT access token
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired access token',
    });
  }
};

/**
 * Authorize user by role
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Authorize content creators or admins — checks isContentCreator flag on User
 */
export const authorizeContentCreator = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // Admins always have access
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  // Check if user is a content creator
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isContentCreator: true },
    });

    if (!user?.isContentCreator) {
      res.status(403).json({ success: false, message: 'Content creator permission required' });
      return;
    }

    req.user.isContentCreator = true;
    next();
  } catch {
    res.status(500).json({ success: false, message: 'Failed to verify permissions' });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};
