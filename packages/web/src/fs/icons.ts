import type { DirEntry } from '@avfs/shared';

/** Pick an emoji icon for a directory entry based on type/extension. */
export function iconFor(entry: Pick<DirEntry, 'name' | 'type'>): string {
  if (entry.type === 'directory') return '📁';
  const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'json': return '🧾';
    case 'md': case 'txt': case 'log': return '📄';
    case 'js': case 'ts': case 'tsx': case 'py': case 'go': return '📜';
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return '🖼';
    case 'csv': case 'tsv': return '📊';
    default: return '📄';
  }
}
