import * as cookie from 'cookie';
import type { Request, Response, NextFunction } from 'express';
import type { ApiResult } from '@avfs/shared';
import { statusForCode } from '../mcp/adapter.js';
import { sessions, verifyCookieValue, COOKIE_NAME } from '../sessions.js';
import type { AvfsAdapter } from '../mcp/adapter.js';

/** Attach the resolved session's adapter + identity to the request. */
export interface AuthedRequest extends Request {
  adapter: AvfsAdapter;
  agentId: string;
  root: string;
}

/** Send an {@link ApiResult}, choosing the HTTP status from the error code. */
export function send<T>(res: Response, result: ApiResult<T>): void {
  if (result.ok) {
    res.json(result);
  } else {
    res.status(statusForCode(result.error.code)).json(result);
  }
}

export function permissionDenied(): { ok: false; error: { code: string; message: string } } {
  return { ok: false, error: { code: 'EPERM', message: 'Permission Denied' } };
}

/** Resolve the signed session cookie or reject with 401. */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const cookies = cookie.parse(req.headers.cookie ?? '');
  const id = verifyCookieValue(cookies[COOKIE_NAME]);
  const session = sessions.get(id);
  if (!session) {
    res.status(401).json({
      ok: false,
      error: { code: 'EAUTH', message: 'Not authenticated' },
    });
    return;
  }
  const r = req as AuthedRequest;
  r.adapter = session.adapter;
  r.agentId = session.agentId;
  r.root = session.root;
  next();
}

/** Wrap an async handler so rejections become a 502 envelope, not a crash. */
export function asyncHandler(
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) {
  return (req: Request, res: Response): void => {
    fn(req as AuthedRequest, res).catch((e: unknown) => {
      res.status(502).json({
        ok: false,
        error: { code: 'EMCP', message: (e as Error).message },
      });
    });
  };
}

/**
 * Reject paths that try to escape via traversal before forwarding to AVFS.
 * AVFS performs the authoritative jail check; this is defense in depth.
 */
export function isSafePath(p: unknown): p is string {
  return typeof p === 'string' && p.startsWith('/') && !p.split('/').includes('..');
}
