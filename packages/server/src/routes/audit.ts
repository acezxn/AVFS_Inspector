import { Router } from 'express';
import { requireSession, asyncHandler, send } from './helpers.js';

export const auditRouter = Router();
auditRouter.use(requireSession);

auditRouter.get('/', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const operation = typeof req.query.operation === 'string' ? req.query.operation : undefined;
  const since = typeof req.query.since === 'string' ? req.query.since : undefined;
  send(res, await req.adapter.auditLog({
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
    operation,
    since,
  }));
}));
