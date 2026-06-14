/**
 * Shared types for AVFS_Inspector.
 *
 * These mirror the AVFS MCP tool contracts (AVFS DESIGN_DOCUMENT.md §7).
 * Every AVFS tool returns the envelope `{ ok, data, error }`; the proxy
 * unwraps that into the {@link ApiResult} discriminated union below.
 */

// ── Envelope / errors ────────────────────────────────────────────────

/** Error shape surfaced to the browser (mapped from AVFS error codes). */
export interface ApiError {
  /** AVFS code (e.g. "EPERM", "ENOENT") or an Inspector code ("EAUTH"). */
  code: string;
  message: string;
  /** Path the error relates to, when applicable. */
  path?: string;
}

/** Discriminated result returned by every proxy route and api-client call. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

/** Raw envelope returned by AVFS tools over MCP. */
export interface AvfsEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// ── Core file-system model ───────────────────────────────────────────

export type InodeType = 'file' | 'directory';

/** A single entry as returned by `ls`. */
export interface DirEntry {
  name: string;
  type: InodeType;
  /** POSIX mode string, e.g. "rwxr-x---" (present when `ls` long=true). */
  mode?: string;
  size_bytes?: number;
  updated_at?: string;
}

/** Full inode metadata as returned by `stat`. */
export interface Inode {
  path: string;
  inode_id: string;
  type: InodeType;
  owner: string;
  mode: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  /** Names of extended attributes present (use getxattr for values). */
  xattrs: string[];
}

// ── Per-tool argument + result types (AVFS §7) ───────────────────────

export interface LsArgs { path: string; long?: boolean; }
export interface LsResult { path: string; entries: DirEntry[]; }

export interface CatArgs { path: string; }
export interface CatResult {
  path: string;
  content: string;
  size_bytes: number;
  content_hash: string;
  updated_at: string;
}

export interface WriteArgs {
  path: string;
  content: string;
  mode?: string;
  excerpt?: string;
}
export interface WriteResult {
  path: string;
  inode_id: string;
  content_hash: string;
  created: boolean;
}

export interface MkdirArgs { path: string; parents?: boolean; }
export interface MkdirResult { path: string; inode_id: string; }

export interface RmArgs { path: string; recursive?: boolean; }
export interface RmResult { removed: string; }

export interface MvArgs { src: string; dst: string; }
export interface MvResult { src: string; dst: string; }

export interface StatArgs { path: string; }
export type StatResult = Inode;

export interface ChmodArgs { path: string; mode: string; acl?: AclEntry[]; }
export interface ChmodResult { path: string; mode: string; }

/** A single ACL grant for cross-agent access. */
export interface AclEntry {
  agent_id: string;
  /** Permission mask: 4=r, 2=w, 1=x (combinable). */
  mode: number;
}

export interface GrepSemanticArgs {
  query: string;
  path_prefix?: string;
  top_k: number;
}
export interface SearchHit {
  path: string;
  inode_id: string;
  score: number;
  excerpt: string;
}
export interface GrepSemanticResult { query: string; results: SearchHit[]; }

export interface AuditLogArgs {
  limit: number;
  offset: number;
  operation?: string;
  since?: string;
}
export interface AuditEvent {
  /** RFC3339 timestamp (AVFS field name is `ts`). */
  ts: string;
  operation: string;
  path: string;
  /** Outcome status string, e.g. "ok" or a POSIX error code. */
  status: string;
}
export interface AuditLogResult {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface GetxattrArgs { path: string; name: string; }
export interface GetxattrResult { path: string; name: string; value: string; updated_at: string; }

export interface ListxattrArgs { path: string; }
export interface ListxattrResult { path: string; names: string[]; }

export interface SetxattrArgs { path: string; name: string; value: string; }
export interface SetxattrResult { path: string; name: string; }

export interface RemovexattrArgs { path: string; name: string; }
export interface RemovexattrResult { path: string; name: string; }

// ── Auth / session ───────────────────────────────────────────────────

export interface LoginArgs {
  token: string;
  /** Optional override of the configured AVFS endpoint. */
  serverUrl?: string;
}
export interface LoginResult {
  agentId: string;
  /** Namespace root for the agent, e.g. "/home/<agentId>/". */
  root: string;
}

/** Names of the AVFS tools, used as the MCP `tools/call` name. */
export type AvfsTool =
  | 'ls' | 'cat' | 'write' | 'mkdir' | 'rm' | 'mv' | 'stat' | 'chmod'
  | 'grep_semantic' | 'audit_log'
  | 'getxattr' | 'listxattr' | 'setxattr' | 'removexattr';
