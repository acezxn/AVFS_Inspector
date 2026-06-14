import { useEffect, useState } from 'react';
import type { Inode } from '@avfs/shared';
import type { AppProps } from '../../shell/appRegistry';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../ui/toast';
import { useDialogs } from '../../ui/dialogs';

type Tab = 'perms' | 'xattrs';

export function Permissions({ win }: AppProps): JSX.Element {
  const path = win.props.path as string | undefined;
  const toast = useToast();
  const dialogs = useDialogs();
  const [tab, setTab] = useState<Tab>('perms');
  const [inode, setInode] = useState<Inode | null>(null);
  const [mode, setMode] = useState('');
  const [xattrs, setXattrs] = useState<{ name: string; value: string }[]>([]);

  const refresh = async (): Promise<void> => {
    if (!path) return;
    try {
      const st = await api.stat(path);
      setInode(st);
      setMode(st.mode);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'stat failed');
    }
  };

  const loadXattrs = async (): Promise<void> => {
    if (!path) return;
    try {
      const list = await api.listxattr(path);
      const pairs = await Promise.all(
        list.names.map(async (name) => ({ name, value: (await api.getxattr(path, name)).value })),
      );
      setXattrs(pairs);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'listxattr failed');
    }
  };

  useEffect(() => { void refresh(); }, [path]);
  useEffect(() => { if (tab === 'xattrs') void loadXattrs(); }, [tab, path]);

  const applyMode = async (): Promise<void> => {
    if (!path) return;
    try { await api.chmod(path, mode); toast.success('Permissions updated'); void refresh(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'chmod failed'); }
  };

  const addXattr = async (): Promise<void> => {
    if (!path) return;
    const name = await dialogs.prompt({ title: 'Set attribute', message: 'Attribute name', initial: 'user.' });
    if (!name) return;
    const value = await dialogs.prompt({ title: 'Set attribute', message: `Value for "${name}"`, initial: '' });
    if (value === null) return;
    try { await api.setxattr(path, name, value); toast.success('Attribute set'); void loadXattrs(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'setxattr failed'); }
  };

  const removeXattr = async (name: string): Promise<void> => {
    if (!path) return;
    try { await api.removexattr(path, name); toast.success('Attribute removed'); void loadXattrs(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'removexattr failed'); }
  };

  if (!path) return <div className="fm__empty">No item selected.</div>;

  return (
    <div className="props">
      <div className="props__tabs">
        <button className={tab === 'perms' ? 'props__tab--active' : ''} onClick={() => setTab('perms')}>Permissions</button>
        <button className={tab === 'xattrs' ? 'props__tab--active' : ''} onClick={() => setTab('xattrs')}>Attributes</button>
      </div>

      {tab === 'perms' && (
        <div className="props__body">
          {inode && (
            <dl className="props__meta">
              <dt>Path</dt><dd>{inode.path}</dd>
              <dt>Type</dt><dd>{inode.type}</dd>
              <dt>Owner</dt><dd>{inode.owner}</dd>
              <dt>Size</dt><dd>{inode.size_bytes} B</dd>
              <dt>Created</dt><dd>{new Date(inode.created_at).toLocaleString()}</dd>
              <dt>Updated</dt><dd>{new Date(inode.updated_at).toLocaleString()}</dd>
            </dl>
          )}
          <label className="props__mode">
            Mode
            <input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="rwxr-x---" />
          </label>
          <button className="btn-primary" onClick={() => void applyMode()} disabled={!inode || mode === inode.mode}>
            Apply
          </button>
        </div>
      )}

      {tab === 'xattrs' && (
        <div className="props__body">
          <table className="props__xattrs">
            <tbody>
              {xattrs.map((x) => (
                <tr key={x.name}>
                  <td className="props__xname">{x.name}</td>
                  <td className="props__xval">{x.value}</td>
                  <td><button className="ctxmenu__danger" onClick={() => void removeXattr(x.name)}>✕</button></td>
                </tr>
              ))}
              {xattrs.length === 0 && <tr><td colSpan={3} className="fm__empty">No extended attributes.</td></tr>}
            </tbody>
          </table>
          <button onClick={() => void addXattr()}>＋ Add attribute</button>
        </div>
      )}
    </div>
  );
}
