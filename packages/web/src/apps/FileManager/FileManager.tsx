import { useCallback, useEffect, useState } from 'react';
import type { DirEntry } from '@avfs/shared';
import type { AppProps } from '../../shell/appRegistry';
import { launchApp } from '../../shell/appRegistry';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../ui/toast';
import { useDialogs } from '../../ui/dialogs';
import { useSession } from '../../session/SessionContext';
import { crumbs, join, parent } from '../../fs/paths';
import { iconFor } from '../../fs/icons';
import { Tree } from './Tree';

interface Menu { x: number; y: number; entry: DirEntry; }

export function FileManager({ win }: AppProps): JSX.Element {
  const { session } = useSession();
  const toast = useToast();
  const dialogs = useDialogs();
  const initial = (win.props.path as string) || session?.root || '/';
  const [path, setPath] = useState(initial);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await api.list(p, true);
      setEntries(res.entries);
      setPath(p);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to list directory');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(initial); }, [initial, load]);

  const openEntry = (entry: DirEntry): void => {
    const childPath = join(path, entry.name);
    if (entry.type === 'directory') void load(childPath + '/');
    else launchApp('editor', { path: childPath }, entry.name);
  };

  const newFolder = async (): Promise<void> => {
    const name = await dialogs.prompt({ title: 'New Folder', message: 'Folder name', initial: 'untitled' });
    if (!name) return;
    try { await api.mkdir(join(path, name)); toast.success('Folder created'); void load(path); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'mkdir failed'); }
  };

  const newFile = async (): Promise<void> => {
    const name = await dialogs.prompt({ title: 'New File', message: 'File name', initial: 'untitled.txt' });
    if (!name) return;
    try { await api.write(join(path, name), ''); toast.success('File created'); void load(path); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'write failed'); }
  };

  const rename = async (entry: DirEntry): Promise<void> => {
    setMenu(null);
    const name = await dialogs.prompt({ title: 'Rename', message: `Rename "${entry.name}" to`, initial: entry.name });
    if (!name || name === entry.name) return;
    try { await api.mv(join(path, entry.name), join(path, name)); toast.success('Renamed'); void load(path); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'mv failed'); }
  };

  const remove = async (entry: DirEntry): Promise<void> => {
    setMenu(null);
    const target = join(path, entry.name);
    const ok = await dialogs.confirm({
      title: 'Delete', danger: true,
      message: `Permanently delete "${target}"? This cannot be undone.`,
    });
    if (!ok) return;
    try { await api.rm(target, entry.type === 'directory'); toast.success('Deleted'); void load(path); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'rm failed'); }
  };

  const showProperties = (entry: DirEntry): void => {
    setMenu(null);
    launchApp('permissions', { path: join(path, entry.name) }, entry.name);
  };

  return (
    <div className="fm" onClick={() => setMenu(null)}>
      <div className="fm__toolbar">
        <button title="Up" onClick={() => void load(parent(path))} disabled={path === '/'}>↑</button>
        <button title="Refresh" onClick={() => void load(path)}>↻</button>
        <nav className="fm__crumbs">
          {crumbs(path).map((c) => (
            <button key={c.path} className="fm__crumb" onClick={() => void load(c.path)}>{c.name}</button>
          ))}
        </nav>
        <div className="fm__spacer" />
        <button onClick={() => void newFolder()}>＋ Folder</button>
        <button onClick={() => void newFile()}>＋ File</button>
      </div>

      <div className="fm__main">
        <aside className="fm__sidebar">
          <Tree root={session?.root ?? '/'} currentPath={path} onNavigate={(p) => void load(p)} />
        </aside>

        <div className="fm__content">
          {loading && <div className="fm__empty">Loading…</div>}
          {!loading && entries.length === 0 && (
            <div className="fm__empty">This folder is empty. Use ＋ File or ＋ Folder.</div>
          )}
          <ul className="fm__grid">
            {entries.map((entry) => {
              const target = join(path, entry.name);
              return (
                <li
                  key={entry.name}
                  className={`fm__item${selected === target ? ' fm__item--selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelected(target); }}
                  onDoubleClick={() => openEntry(entry)}
                  onContextMenu={(e) => { e.preventDefault(); setSelected(target); setMenu({ x: e.clientX, y: e.clientY, entry }); }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openEntry(entry);
                    if (e.key === 'F2') void rename(entry);
                    if (e.key === 'Delete') void remove(entry);
                  }}
                >
                  <span className="fm__item-icon" aria-hidden>{iconFor(entry)}</span>
                  <span className="fm__item-name">{entry.name}</span>
                  {entry.mode && <span className="fm__item-mode">{entry.mode}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {menu && (
        <ul className="ctxmenu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <li onClick={() => openEntry(menu.entry)}>Open</li>
          {menu.entry.type === 'file' && (
            <li onClick={() => { launchApp('editor', { path: join(path, menu.entry.name) }, menu.entry.name); setMenu(null); }}>
              Open in Editor
            </li>
          )}
          <li onClick={() => void rename(menu.entry)}>Rename</li>
          <li onClick={() => void showProperties(menu.entry)}>Properties</li>
          <li className="ctxmenu__danger" onClick={() => void remove(menu.entry)}>Delete</li>
        </ul>
      )}
    </div>
  );
}
