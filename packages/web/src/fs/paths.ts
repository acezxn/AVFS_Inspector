/** Pure path helpers for the agent's POSIX-like namespace. */

export function normalize(path: string): string {
  const isDir = path.endsWith('/');
  const parts: string[] = [];
  for (const seg of path.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  const joined = '/' + parts.join('/');
  return isDir && joined !== '/' ? joined + '/' : joined;
}

export function join(base: string, name: string): string {
  return normalize(base.endsWith('/') ? base + name : base + '/' + name);
}

export function parent(path: string): string {
  const norm = normalize(path).replace(/\/$/, '');
  const idx = norm.lastIndexOf('/');
  return idx <= 0 ? '/' : norm.slice(0, idx) + '/';
}

export function basename(path: string): string {
  const norm = normalize(path).replace(/\/$/, '');
  const idx = norm.lastIndexOf('/');
  return idx < 0 ? norm : norm.slice(idx + 1);
}

/** Breadcrumb segments: [{ name, path }] from root to the given path. */
export function crumbs(path: string): { name: string; path: string }[] {
  const norm = normalize(path).replace(/\/$/, '');
  const segs = norm.split('/').filter(Boolean);
  const out: { name: string; path: string }[] = [{ name: '/', path: '/' }];
  let acc = '';
  for (const seg of segs) {
    acc += '/' + seg;
    out.push({ name: seg, path: acc + '/' });
  }
  return out;
}
