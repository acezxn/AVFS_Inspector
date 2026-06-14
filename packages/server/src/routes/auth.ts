import * as cookie from 'cookie';
import { Router } from 'express';
import { z } from 'zod';
import type { LoginResult } from '@avfs/shared';
import { authenticate, McpError } from '../mcp/client.js';
import { sessions, makeCookieValue, verifyCookieValue, COOKIE_NAME } from '../sessions.js';
import { config } from '../config.js';

const loginSchema = z.object({
  token: z.string().min(1),
  serverUrl: z.string().url().optional(),
});

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: { code: 'EINVAL', message: 'token is required' } });
    return;
  }

  try {
    const mcp = await authenticate(parsed.data.token, parsed.data.serverUrl);
    const session = sessions.create(mcp.agentId, mcp);
    res.setHeader(
      'Set-Cookie',
      cookie.serialize(COOKIE_NAME, makeCookieValue(session.id), {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: Math.floor(config.sessionTtlMs / 1000),
      }),
    );
    const data: LoginResult = { agentId: session.agentId, root: session.root };
    res.json({ ok: true, data });
  } catch (e) {
    const err = e instanceof McpError ? e : new McpError((e as Error).message);
    const status = err.code === 'EAUTH' ? 401 : 502;
    res.status(status).json({ ok: false, error: { code: err.code, message: err.message } });
  }
});

authRouter.post('/logout', (req, res) => {
  const cookies = cookie.parse(req.headers.cookie ?? '');
  const id = verifyCookieValue(cookies[COOKIE_NAME]);
  if (id) sessions.destroy(id);
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 }),
  );
  res.json({ ok: true, data: { loggedOut: true } });
});
