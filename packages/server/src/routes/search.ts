import { Router } from 'express';
import { requireSession, asyncHandler, send, isSafePath, permissionDenied } from './helpers.js';

export const searchRouter = Router();
searchRouter.use(requireSession);

searchRouter.get('/', asyncHandler(async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q : '';
  if (!query) {
    return void res.status(400).json({ ok: false, error: { code: 'EINVAL', message: 'q is required' } });
  }
  const pathPrefix = typeof req.query.path_prefix === 'string' ? req.query.path_prefix : undefined;
  if (pathPrefix !== undefined && !isSafePath(pathPrefix)) {
    return void res.status(403).json(permissionDenied());
  }
  const topK = Number(req.query.top_k ?? 20);
  send(res, await req.adapter.grepSemantic({
    query,
    path_prefix: pathPrefix,
    top_k: Number.isFinite(topK) ? topK : 20,
  }));
}));
