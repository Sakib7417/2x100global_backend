import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

import { isAppError } from '../utils/errors';
import logger from '../utils/logger';

// Re-exported so the many `import { AppError } from '../middlewares/error.middleware'`
// call sites keep working. New code should import from '../utils/errors'.
export { AppError } from '../utils/errors';

/**
 * Global error handler.
 *
 * Contract (unchanged, so the frontend needs no migration):
 *   { success: false, message: string, errors?: [{ field, message }] }
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ---- Zod (schemas parsed outside the validation middleware) -------------
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  // ---- Prisma -------------------------------------------------------------
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // The unique constraint that failed, when Prisma reports it, lets us say
      // *what* was duplicated instead of a generic conflict message.
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : undefined;

      res.status(409).json({
        success: false,
        message: field
          ? `A record with this ${field} already exists`
          : 'A record with these details already exists',
      });
      return;
    }

    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }

    if (error.code === 'P2003') {
      res.status(400).json({
        success: false,
        message: 'Referenced record does not exist',
      });
      return;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    // A malformed query is our bug, never the caller's — do not echo it back.
    logger.error('Prisma validation error', { message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
    return;
  }

  // ---- JWT ----------------------------------------------------------------
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token expired' });
    return;
  }

  // ---- BigInt serialisation ----------------------------------------------
  //
  // `Deposit.blockNumber` and `BlockchainTransaction.blockNumber` are Prisma
  // BigInt columns. `res.json()` throws `TypeError: Do not know how to
  // serialize a BigInt` when one is non-null, which lands here.
  //
  // The real fix is the global BigInt.prototype.toJSON shim installed in
  // src/index.ts; this branch remains as a safety net so a serialisation
  // failure degrades to a clear 500 rather than an unhandled throw that kills
  // the response.
  if (error instanceof TypeError && /BigInt/i.test(error.message)) {
    logger.error('BigInt serialisation failure', {
      path: req.originalUrl,
      message: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
    return;
  }

  // ---- Application errors -------------------------------------------------
  if (isAppError(error)) {
    // Operational errors are expected; log at info so they do not pollute
    // error-rate alerting. Non-operational ones are bugs and get full weight.
    if (error.isOperational) {
      logger.info('Handled application error', {
        status: error.statusCode,
        path: req.originalUrl,
        message: error.message,
      });
    } else {
      logger.error('Non-operational application error', {
        status: error.statusCode,
        path: req.originalUrl,
        message: error.message,
        stack: error.stack,
      });
    }

    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  // ---- Unknown ------------------------------------------------------------
  //
  // Anything reaching here is an unclassified throw: a genuine bug, or a
  // service that has not yet been migrated to AppError. Never echo the message
  // or stack — it can contain absolute paths, SQL fragments and internals.
  // The full detail goes to the logs, keyed by URL so it stays traceable.
  logger.error('Unhandled error', {
    path: req.originalUrl,
    method: req.method,
    name: error.name,
    message: error.message,
    stack: error.stack,
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

/**
 * 404 handler.
 *
 * Echoes only the method and a sanitised path. The previous version
 * interpolated `req.path` directly, which is attacker-controlled and was
 * reflected verbatim into the JSON body.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const safePath = req.path.replace(/[^\w\-/.]/g, '');
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${safePath} not found`,
  });
};
