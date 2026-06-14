import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import type { McpSession } from './mcp/client.js';
import { AvfsAdapter } from './mcp/adapter.js';

interface Session {
  id: string;
  agentId: string;
  root: string;
  mcp: McpSession;
  adapter: AvfsAdapter;
  lastSeen: number;
}

/**
 * In-memory registry mapping an opaque session id to a live MCP session.
 * The raw agent token is never stored here or returned to the browser —
 * only the authenticated {@link McpSession} it produced.
 */
class SessionRegistry {
  private sessions = new Map<string, Session>();

  constructor() {
    setInterval(() => this.reap(), 60_000).unref();
  }

  create(agentId: string, mcp: McpSession): Session {
    const id = randomBytes(32).toString('hex');
    const session: Session = {
      id,
      agentId,
      root: `/home/${agentId}/`,
      mcp,
      adapter: new AvfsAdapter(mcp),
      lastSeen: Date.now(),
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string | undefined): Session | undefined {
    if (!id) return undefined;
    const s = this.sessions.get(id);
    if (!s) return undefined;
    if (Date.now() - s.lastSeen > config.sessionTtlMs) {
      this.destroy(id);
      return undefined;
    }
    s.lastSeen = Date.now();
    return s;
  }

  destroy(id: string): void {
    const s = this.sessions.get(id);
    if (s) {
      s.mcp.close();
      this.sessions.delete(id);
    }
  }

  private reap(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now - s.lastSeen > config.sessionTtlMs) this.destroy(id);
    }
  }
}

export const sessions = new SessionRegistry();

// ── Signed cookie helpers (sessionId.signature) ──────────────────────

const COOKIE = 'avfs_sid';

function sign(value: string): string {
  return createHmac('sha256', config.sessionSecret).update(value).digest('hex');
}

export function makeCookieValue(id: string): string {
  return `${id}.${sign(id)}`;
}

export function verifyCookieValue(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const dot = raw.lastIndexOf('.');
  if (dot < 0) return undefined;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  return id;
}

export const COOKIE_NAME = COOKIE;
