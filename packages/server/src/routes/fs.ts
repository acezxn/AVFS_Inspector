import { Router } from 'express';
import { z } from 'zod';
import { requireSession, asyncHandler, send, isSafePath, permissionDenied } from './helpers.js';

export const fsRouter = Router();
fsRouter.use(requireSession);

function invalidRequest(): { ok: false; error: { code: string; message: string } } {
  return { ok: false, error: { code: 'EINVAL', message: 'Invalid request' } };
}

// ── reads ────────────────────────────────────────────────────────────

fsRouter.get('/list', asyncHandler(async (req, res) => {
  const path = req.query.path;
  if (!isSafePath(path)) return void res.status(403).json(permissionDenied());
  send(res, await req.adapter.ls({ path, long: req.query.long === 'true' }));
}));

fsRouter.get('/read', asyncHandler(async (req, res) => {
  const path = req.query.path;
  if (!isSafePath(path)) return void res.status(403).json(permissionDenied());
  send(res, await req.adapter.cat({ path }));
}));

fsRouter.get('/stat', asyncHandler(async (req, res) => {
  const path = req.query.path;
  if (!isSafePath(path)) return void res.status(403).json(permissionDenied());
  send(res, await req.adapter.stat({ path }));
}));

// ── writes ───────────────────────────────────────────────────────────

const writeSchema = z.object({
  path: z.string(),
  content: z.string(),
  mode: z.string().optional(),
  excerpt: z.string().optional(),
});
fsRouter.put('/write', asyncHandler(async (req, res) => {
  const body = writeSchema.safeParse(req.body);
  if (!body.success) return void res.status(400).json(invalidRequest());
  if (!isSafePath(body.data.path)) return void res.status(403).json(permissionDenied());
  send(res, await req.adapter.write(body.data));
}));

const mkdirSchema = z.object({ path: z.string(), parents: z.boolean().optional() });
fsRouter.post('/mkdir', asyncHandler(async (req, res) => {
  const body = mkdirSchema.safeParse(req.body);
  if (!body.success) return void res.status(400).json(invalidRequest());
  if (!isSafePath(body.data.path)) return void res.status(403).json(permissionDenied());
  send(res, await req.adapter.mkdir(body.data));
}));

const mvSchema = z.object({ src: z.string(), dst: z.string() });
fsRouter.post('/mv', asyncHandler(async (req, res) => {
  const body = mvSchema.safeParse(req.body);
  if (!body.success) return void res.status(400).json(invalidRequest());
  if (!isSafePath(body.data.src) || !isSafePath(body.data.dst)) {
    return void res.status(403).json(permissionDenied());
  }
  send(res, await req.adapter.mv(body.data));
}));

const chmodSchema = z.object({
  path: z.string(),
  mode: z.string(),
  acl: z.array(z.object({ agent_id: z.string(), mode: z.number() })).optional(),
});
fsRouter.post('/chmod', asyncHandler(async (req, res) => {
  const body = chmodSchema.safeParse(req.body);
  if (!body.success) return void res.status(400).json(invalidRequest());
  if (!isSafePath(body.data.path)) return void res.status(403).json(permissionDenied());
  send(res, await req.adapter.chmod(body.data));
}));

// Destructive: require an explicit confirm flag.
fsRouter.delete('/rm', asyncHandler(async (req, res) => {
  const path = req.query.path;
  if (!isSafePath(path)) return void res.status(403).json(permissionDenied());
  if (req.query.confirm !== 'true') {
    return void res.status(400).json({
      ok: false,
      error: { code: 'EINVAL', message: 'rm requires confirm=true', path },
    });
  }
  send(res, await req.adapter.rm({ path, recursive: req.query.recursive === 'true' }));
}));

// ── extended attributes ──────────────────────────────────────────────

fsRouter.get('/xattr', asyncHandler(async (req, res) => {
  const path = req.query.path;
  if (!isSafePath(path)) return void res.status(403).json(permissionDenied());
  const name = req.query.name;
  if (typeof name === 'string') {
    send(res, await req.adapter.getxattr({ path, name }));
  } else {
    send(res, await req.adapter.listxattr({ path }));
  }
}));

const setxattrSchema = z.object({ path: z.string(), name: z.string(), value: z.string() });
fsRouter.post('/xattr', asyncHandler(async (req, res) => {
  const body = setxattrSchema.safeParse(req.body);
  if (!body.success) return void res.status(400).json(invalidRequest());
  if (!isSafePath(body.data.path)) return void res.status(403).json(permissionDenied());
  send(res, await req.adapter.setxattr(body.data));
}));

fsRouter.delete('/xattr', asyncHandler(async (req, res) => {
  const path = req.query.path;
  const name = req.query.name;
  if (!isSafePath(path)) return void res.status(403).json(permissionDenied());
  if (typeof name !== 'string') return void res.status(400).json(invalidRequest());
  send(res, await req.adapter.removexattr({ path, name }));
}));
