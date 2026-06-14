import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import type { AvfsEnvelope } from '@avfs/shared';

/**
 * A single authenticated MCP session against the AVFS server.
 *
 * AVFS speaks newline-delimited JSON-RPC 2.0 over stdio (primary) or HTTP.
 * Identity is bound at `initialize` time via the operator's agent token.
 * The exact token-passing mechanism is underspecified by AVFS, so it is
 * isolated here behind {@link authenticate} and driven by config:
 *   - `init-param`  : token travels in the initialize params
 *   - `http-header` : token travels as an HTTP header (http transport only)
 */
export interface McpSession {
  readonly agentId: string;
  /** Invoke an AVFS tool and return its raw `{ ok, data, error }` envelope. */
  call<T>(tool: string, args: Record<string, unknown>): Promise<AvfsEnvelope<T>>;
  close(): void;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** Minimal JSON-RPC transport interface implemented by stdio + http. */
interface Transport {
  send(req: JsonRpcRequest): Promise<JsonRpcResponse>;
  close(): void;
}

export class McpError extends Error {
  constructor(
    message: string,
    readonly code: string = 'EMCP',
  ) {
    super(message);
    this.name = 'McpError';
  }
}

// ── stdio transport: spawn the AVFS binary, frame newline-delimited JSON ──

class StdioTransport implements Transport {
  private proc: ChildProcessByStdio<Writable, Readable, null>;
  private buffer = '';
  private pending = new Map<string, (res: JsonRpcResponse) => void>();

  constructor() {
    this.proc = spawn(config.mcp.command, config.mcp.args, {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk: string) => this.onData(chunk));
    this.proc.on('exit', () => {
      for (const resolve of this.pending.values()) {
        resolve({ jsonrpc: '2.0', id: '', error: { code: -1, message: 'AVFS process exited' } });
      }
      this.pending.clear();
    });
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line) as JsonRpcResponse;
        const resolve = this.pending.get(msg.id);
        if (resolve) {
          this.pending.delete(msg.id);
          resolve(msg);
        }
      } catch {
        // Ignore non-JSON noise on stdout.
      }
    }
  }

  send(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      this.pending.set(req.id, resolve);
      this.proc.stdin.write(JSON.stringify(req) + '\n', (err) => {
        if (err) {
          this.pending.delete(req.id);
          reject(new McpError('Failed to write to AVFS stdin'));
        }
      });
    });
  }

  close(): void {
    this.proc.kill();
  }
}

// ── http transport: POST JSON-RPC to the AVFS HTTP endpoint ──────────────

class HttpTransport implements Transport {
  constructor(
    private readonly baseUrl: string,
    private readonly headers: Record<string, string>,
  ) {}

  async send(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...this.headers },
        body: JSON.stringify(req),
      });
    } catch (e) {
      throw new McpError(`AVFS unreachable: ${(e as Error).message}`, 'ECONN');
    }
    if (!res.ok) throw new McpError(`AVFS HTTP ${res.status}`, 'EHTTP');
    return (await res.json()) as JsonRpcResponse;
  }

  close(): void {
    // Stateless; nothing to tear down.
  }
}

function rpc(method: string, params?: unknown): JsonRpcRequest {
  return { jsonrpc: '2.0', id: randomUUID(), method, params };
}

/**
 * Unwrap a `tools/call` JSON-RPC response into AVFS's `{ ok, data, error }`
 * envelope. AVFS returns the MCP tool-result shape
 * `{ content: [{type, text}], isError, structuredContent: <Envelope> }`, so the
 * envelope lives in `structuredContent` (with the text block as a fallback).
 */
function toolEnvelope<T>(res: JsonRpcResponse): AvfsEnvelope<T> {
  if (res.error) throw new McpError(res.error.message, String(res.error.code));
  const result = res.result as
    | { structuredContent?: AvfsEnvelope<T>; content?: { type: string; text?: string }[] }
    | undefined;
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((c) => c.type === 'text')?.text;
  if (text) return JSON.parse(text) as AvfsEnvelope<T>;
  return { ok: false, data: null, error: { code: 'EUNKNOWN', message: 'Empty tool result' } };
}

/**
 * Establish + authenticate a session. On success the AVFS server has bound
 * this connection to an `agent_id`, returned from `initialize`.
 */
export async function authenticate(token: string, serverUrl?: string): Promise<McpSession> {
  // Over http, AVFS reads the token ONLY from the Authorization header
  // (the request body never carries the credential). Over stdio there is no
  // header, so the token must travel in the initialize `credentials` object.
  // We pick the right mechanism from the transport — not a separate auth-mode
  // flag — so the two can never get out of sync.
  const isHttp = config.mcp.transport === 'http';

  const transport: Transport = isHttp
    ? new HttpTransport(serverUrl ?? config.mcp.httpUrl, {
        [config.auth.header]: `Bearer ${token}`,
      })
    : new StdioTransport();

  const initParams: Record<string, unknown> = {
    protocolVersion: '2025-06-18',
    clientInfo: { name: 'AVFS_Inspector', version: '0.1.0' },
    capabilities: {},
  };
  // stdio handshake: AVFS authenticate() reads params.credentials.token.
  if (!isHttp) initParams.credentials = { token };

  let initRes: JsonRpcResponse;
  try {
    initRes = await transport.send(rpc('initialize', initParams));
  } catch (e) {
    transport.close();
    throw e instanceof McpError ? e : new McpError((e as Error).message, 'ECONN');
  }

  if (initRes.error) {
    transport.close();
    throw new McpError(initRes.error.message || 'Authentication failed', 'EAUTH');
  }

  const call = async <T>(tool: string, args: Record<string, unknown>): Promise<AvfsEnvelope<T>> => {
    const res = await transport.send(rpc('tools/call', { name: tool, arguments: args }));
    return toolEnvelope<T>(res);
  };

  // AVFS `initialize` does not return the bound identity; `whoami` does.
  let agentId: string;
  try {
    const who = await call<{ agent_id: string }>('whoami', {});
    if (!who.ok || !who.data?.agent_id) throw new McpError('whoami returned no identity', 'EAUTH');
    agentId = who.data.agent_id;
  } catch (e) {
    transport.close();
    throw e instanceof McpError ? e : new McpError((e as Error).message, 'EAUTH');
  }

  return { agentId, call, close: () => transport.close() };
}
