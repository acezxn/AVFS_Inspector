import type {
  ApiError,
  ApiResult,
  AvfsEnvelope,
  AvfsTool,
  LsArgs, LsResult,
  CatArgs, CatResult,
  WriteArgs, WriteResult,
  MkdirArgs, MkdirResult,
  RmArgs, RmResult,
  MvArgs, MvResult,
  StatArgs, StatResult,
  ChmodArgs, ChmodResult,
  GrepSemanticArgs, GrepSemanticResult,
  AuditLogArgs, AuditLogResult,
  GetxattrArgs, GetxattrResult,
  ListxattrArgs, ListxattrResult,
  SetxattrArgs, SetxattrResult,
  RemovexattrArgs, RemovexattrResult,
} from '@avfs/shared';
import type { McpSession } from './client.js';
import { McpError } from './client.js';

const PERMISSION_DENIED_MESSAGE = 'Permission Denied';
const PATH_ESCAPE_RE = /\bpath\s+escapes\s+agent\s+namespace\b/i;

/**
 * Single integration point for AVFS's tool surface. Each method maps one
 * AVFS tool to a typed call and normalizes the `{ ok, data, error }`
 * envelope into an {@link ApiResult}. If the tool surface changes, this
 * file is the only place that needs updating.
 */
export class AvfsAdapter {
  constructor(private readonly session: McpSession) {}

  private async call<TArgs extends object, TResult>(
    tool: AvfsTool,
    args: TArgs,
  ): Promise<ApiResult<TResult>> {
    let env: AvfsEnvelope<TResult>;
    try {
      env = await this.session.call<TResult>(tool, args as Record<string, unknown>);
    } catch (e) {
      const err = e instanceof McpError ? e : new McpError((e as Error).message);
      return { ok: false, error: sanitizeApiError(err.code, err.message) };
    }
    if (env.ok && env.data !== null) {
      return { ok: true, data: env.data };
    }
    const code = env.error?.code ?? 'EUNKNOWN';
    const message = env.error?.message ?? 'AVFS returned an empty result';
    return {
      ok: false,
      error: sanitizeApiError(code, message),
    };
  }

  ls(args: LsArgs) { return this.call<LsArgs, LsResult>('ls', args); }
  cat(args: CatArgs) { return this.call<CatArgs, CatResult>('cat', args); }
  write(args: WriteArgs) { return this.call<WriteArgs, WriteResult>('write', args); }
  mkdir(args: MkdirArgs) { return this.call<MkdirArgs, MkdirResult>('mkdir', args); }
  rm(args: RmArgs) { return this.call<RmArgs, RmResult>('rm', args); }
  mv(args: MvArgs) { return this.call<MvArgs, MvResult>('mv', args); }
  stat(args: StatArgs) { return this.call<StatArgs, StatResult>('stat', args); }
  chmod(args: ChmodArgs) { return this.call<ChmodArgs, ChmodResult>('chmod', args); }
  grepSemantic(args: GrepSemanticArgs) {
    return this.call<GrepSemanticArgs, GrepSemanticResult>('grep_semantic', args);
  }
  auditLog(args: AuditLogArgs) {
    return this.call<AuditLogArgs, AuditLogResult>('audit_log', args);
  }
  getxattr(args: GetxattrArgs) { return this.call<GetxattrArgs, GetxattrResult>('getxattr', args); }
  listxattr(args: ListxattrArgs) { return this.call<ListxattrArgs, ListxattrResult>('listxattr', args); }
  setxattr(args: SetxattrArgs) { return this.call<SetxattrArgs, SetxattrResult>('setxattr', args); }
  removexattr(args: RemovexattrArgs) {
    return this.call<RemovexattrArgs, RemovexattrResult>('removexattr', args);
  }
}

export function sanitizeApiError(code: string, message: string): ApiError {
  if (code === 'EPERM' || code === 'EACCES') {
    return { code, message: PERMISSION_DENIED_MESSAGE };
  }
  if (PATH_ESCAPE_RE.test(message)) {
    return { code: 'EPERM', message: PERMISSION_DENIED_MESSAGE };
  }
  return { code, message };
}

/** Map an AVFS / Inspector error code to an HTTP status. */
export function statusForCode(code: string): number {
  switch (code) {
    case 'EAUTH': return 401;
    case 'EPERM': case 'EACCES': return 403;
    case 'ENOENT': return 404;
    case 'EEXIST': return 409;
    case 'EINVAL': return 400;
    case 'ECONN': case 'EHTTP': case 'EMCP': return 502;
    default: return 400;
  }
}
