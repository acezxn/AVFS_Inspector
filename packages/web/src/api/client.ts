import type {
  ApiResult,
  LoginArgs, LoginResult,
  LsResult, CatResult, WriteResult, MkdirResult, RmResult, MvResult,
  StatResult, ChmodResult, AclEntry,
  GrepSemanticResult, AuditLogResult,
  ListxattrResult, GetxattrResult, SetxattrResult, RemovexattrResult,
} from '@avfs/shared';
import { notifyExpired } from './expire';

const BASE = '/api';

/** Thrown when a proxy call returns ok:false; carries the AVFS error code. */
export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly path?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      ...init,
    });
  } catch (e) {
    throw new ApiError('ECONN', `Network error: ${(e as Error).message}`);
  }
  const body = (await res.json().catch(() => null)) as ApiResult<T> | null;
  if (res.status === 401) {
    notifyExpired();
    throw new ApiError('EAUTH', body && !body.ok ? body.error.message : 'Session expired');
  }
  if (!body) throw new ApiError('EPARSE', `Unexpected response (${res.status})`);
  if (!body.ok) throw new ApiError(body.error.code, body.error.message, body.error.path);
  return body.data;
}

const qs = (params: Record<string, string | boolean | number | undefined>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // auth
  login: (args: LoginArgs) =>
    request<LoginResult>('/login', { method: 'POST', body: JSON.stringify(args) }),
  logout: () => request<{ loggedOut: boolean }>('/logout', { method: 'POST' }),

  // file system
  list: (path: string, long = false) =>
    request<LsResult>(`/fs/list${qs({ path, long })}`),
  read: (path: string) => request<CatResult>(`/fs/read${qs({ path })}`),
  stat: (path: string) => request<StatResult>(`/fs/stat${qs({ path })}`),
  write: (path: string, content: string, mode?: string, excerpt?: string) =>
    request<WriteResult>('/fs/write', {
      method: 'PUT',
      body: JSON.stringify({ path, content, mode, excerpt }),
    }),
  mkdir: (path: string, parents = false) =>
    request<MkdirResult>('/fs/mkdir', { method: 'POST', body: JSON.stringify({ path, parents }) }),
  mv: (src: string, dst: string) =>
    request<MvResult>('/fs/mv', { method: 'POST', body: JSON.stringify({ src, dst }) }),
  rm: (path: string, recursive = false) =>
    request<RmResult>(`/fs/rm${qs({ path, confirm: true, recursive })}`, { method: 'DELETE' }),
  chmod: (path: string, mode: string, acl?: AclEntry[]) =>
    request<ChmodResult>('/fs/chmod', { method: 'POST', body: JSON.stringify({ path, mode, acl }) }),

  // extended attributes
  listxattr: (path: string) => request<ListxattrResult>(`/fs/xattr${qs({ path })}`),
  getxattr: (path: string, name: string) =>
    request<GetxattrResult>(`/fs/xattr${qs({ path, name })}`),
  setxattr: (path: string, name: string, value: string) =>
    request<SetxattrResult>('/fs/xattr', {
      method: 'POST',
      body: JSON.stringify({ path, name, value }),
    }),
  removexattr: (path: string, name: string) =>
    request<RemovexattrResult>(`/fs/xattr${qs({ path, name })}`, { method: 'DELETE' }),

  // search + audit
  search: (q: string, pathPrefix?: string, topK = 20) =>
    request<GrepSemanticResult>(`/search${qs({ q, path_prefix: pathPrefix, top_k: topK })}`),
  audit: (limit = 50, offset = 0, operation?: string, since?: string) =>
    request<AuditLogResult>(`/audit${qs({ limit, offset, operation, since })}`),
};
