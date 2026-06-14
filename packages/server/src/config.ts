import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// The server runs with cwd = packages/server, but the .env lives at the
// monorepo root. Load it explicitly relative to this module (works the same
// from src/ under tsx and dist/ after build — both are one level under
// packages/server). A shell-exported var still wins: dotenv never overrides
// values already present in process.env. A packages/server/.env, if present,
// is loaded too and takes precedence over the root file.
const moduleDir = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(moduleDir, '..', '.env') }); // packages/server/.env (optional)
loadDotenv({ path: resolve(moduleDir, '..', '..', '..', '.env') }); // monorepo root .env

export type McpTransport = 'stdio' | 'http';

export interface Config {
  port: number;
  sessionSecret: string;
  sessionTtlMs: number;
  webOrigin: string;
  mcp: {
    transport: McpTransport;
    /** stdio mode */
    command: string;
    args: string[];
    /** http mode */
    httpUrl: string;
  };
  auth: {
    /** Header name used to carry the Bearer token over http transport. */
    header: string;
  };
}

function env(name: string, fallback?: string, aliases: string[] = []): string {
  for (const key of [name, ...aliases]) {
    const value = process.env[key];
    if (value !== undefined && value !== '') return value;
  }
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${name}`);
}

function envNumber(name: string, fallback: number, aliases: string[] = []): number {
  const raw = env(name, String(fallback), aliases);
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric env var ${name}: ${raw}`);
  }
  return value;
}

function envCsv(name: string, fallback: string, aliases: string[] = []): string[] {
  return env(name, fallback, aliases)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function envTransport(name: string, fallback: McpTransport): McpTransport {
  const value = env(name, fallback);
  if (value !== 'stdio' && value !== 'http') {
    throw new Error(`Invalid ${name}: expected "stdio" or "http", got "${value}"`);
  }
  return value;
}

const webPort = envNumber('INSPECTOR_WEB_PORT', 5173);

export const config: Config = {
  port: envNumber('INSPECTOR_API_PORT', 3000, ['PORT']),
  sessionSecret: env('INSPECTOR_SESSION_SECRET', 'dev-insecure-secret', ['SESSION_SECRET']),
  sessionTtlMs: envNumber('INSPECTOR_SESSION_TTL_MS', 30 * 60 * 1000, ['SESSION_TTL_MS']),
  webOrigin: env('INSPECTOR_WEB_ORIGIN', `http://localhost:${webPort}`, ['WEB_ORIGIN']),
  mcp: {
    transport: envTransport('AVFS_MCP_TRANSPORT', 'http'),
    command: env('AVFS_MCP_COMMAND', './bin/avfs'),
    args: envCsv('AVFS_MCP_ARGS', 'serve,--config,avfs.yaml'),
    httpUrl: env('AVFS_MCP_HTTP_URL', 'http://127.0.0.1:8765'),
  },
  auth: {
    header: env('AVFS_AUTH_HEADER', 'Authorization'),
  },
};
