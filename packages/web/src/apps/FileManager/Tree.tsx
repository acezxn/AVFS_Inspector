import { useEffect, useState } from 'react';
import type { DirEntry } from '@avfs/shared';
import { api } from '../../api/client';
import { join } from '../../fs/paths';

interface NodeProps {
  path: string;
  label: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  defaultOpen?: boolean;
}

function TreeNode({ path, label, currentPath, onNavigate, defaultOpen }: NodeProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);
  const active = currentPath === path || currentPath === path + '/';

  useEffect(() => {
    if (open && children === null) {
      api.list(path).then((r) => setChildren(r.entries.filter((e) => e.type === 'directory'))).catch(() => setChildren([]));
    }
  }, [open, children, path]);

  return (
    <div className="tree__node">
      <div className={`tree__row${active ? ' tree__row--active' : ''}`}>
        <button className="tree__toggle" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Collapse' : 'Expand'}>
          {open ? '▾' : '▸'}
        </button>
        <button className="tree__label" onClick={() => onNavigate(path.endsWith('/') ? path : path + '/')}>
          📁 {label}
        </button>
      </div>
      {open && children && (
        <div className="tree__children">
          {children.map((c) => (
            <TreeNode
              key={c.name}
              path={join(path, c.name)}
              label={c.name}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />
          ))}
          {children.length === 0 && <div className="tree__empty">—</div>}
        </div>
      )}
    </div>
  );
}

export function Tree({ root, currentPath, onNavigate }: { root: string; currentPath: string; onNavigate: (p: string) => void }): JSX.Element {
  return (
    <div className="tree">
      <TreeNode path={root} label="home" currentPath={currentPath} onNavigate={onNavigate} defaultOpen />
    </div>
  );
}
