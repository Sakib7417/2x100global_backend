/**
 * Typed application errors.
 *
 * WHY THIS EXISTS
 * ---------------
 * Services previously threw plain `new Error(MESSAGE)`. The global error
 * handler only maps `AppError` instances to a status code, so every one of
 * those fell through to the default branch and was returned as:
 *
 *     HTTP 500 { success: false, message: "...", stack: "..." }
 *
 * That is wrong in three separate ways:
 *   1. Semantics — a wrong password is a 401, not a server fault. Clients
 *      cannot distinguish "you did something invalid" from "we broke", so they
 *      cannot decide whether retrying is sensible.
 *   2. Security — the default branch attaches a stack trace whenever
 *      NODE_ENV !== 'production', exposing absolute paths and internals.
 *   3. Observability — genuine 500s are indistinguishable from routine
 *      validation failures, so error-rate alerting is meaningless.
 *
 * Throwing one of the subclasses below fixes all three at the throw site,
 * where the author actually knows what kind of failure it is.
 *
 * `isOperational` marks *expected* failures (bad input, missing record,
 * business rule violation) as opposed to genuine bugs. The handler uses it to
 * decide what may be shown to a client and what must be logged loudly.
 */

export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = new.target.name;

    // Required when targeting ES5/ES2017 from TypeScript: without it,
    // `instanceof` fails for subclasses of built-ins like Error.
    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace?.(this, new.target);
  }
}

/**
 * 400 — the request itself is malformed or violates a business rule.
 * e.g. amount below the minimum, transfer between the same wallet.
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

/**
 * 401 — no valid credentials. Use for bad passwords, expired/revoked tokens
 * and disabled accounts, i.e. "we do not know who you are (any more)".
 */
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
  }
}

/**
 * 403 — identity is known, permission is not granted.
 * Do not use for authentication failures; that ambiguity is what makes 401 vs
 * 403 confusing in most codebases.
 */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message);
  }
}

/** 404 — the addressed resource does not exist (or is not visible to caller). */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

/**
 * 409 — the request conflicts with current state.
 * e.g. duplicate email, duplicate transaction hash, withdrawal already
 * processed. Distinct from 400: the input is well-formed, the world disagrees.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

/**
 * 422 — semantically invalid despite being well-formed and non-conflicting.
 * Used sparingly; most input problems here are 400.
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string) {
    super(422, message);
  }
}

/** 502 — an upstream dependency (RPC node, mail relay) failed. */
export class UpstreamError extends AppError {
  constructor(message: string) {
    // Not operational: an RPC failure is not something the caller did, and it
    // should page someone if it becomes frequent.
    super(502, message, false);
  }
}

/**
 * 500 — an invariant we believe cannot be violated has been violated.
 * Reaching one of these is a bug, so it is explicitly non-operational.
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, false);
  }
}

/** Narrowing helper for the error handler and for tests. */
export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;
