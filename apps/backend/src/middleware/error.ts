import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Express recognises a 4-argument function as an error handler.
// The `next` parameter must be present even if unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  if (res.headersSent) {
    // Delegate to Express's default handler if headers are already out
    next(err);
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
