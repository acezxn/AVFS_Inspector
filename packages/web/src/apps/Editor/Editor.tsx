import { useEffect, useState } from 'react';
import type { AppProps } from '../../shell/appRegistry';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../ui/toast';
import { useDialogs } from '../../ui/dialogs';
import { basename } from '../../fs/paths';

const MAX_INLINE = 256 * 1024; // 256 KB

export function Editor({ win }: AppProps): JSX.Element {
  const path = win.props.path as string | undefined;
  const toast = useToast();
  const dialogs = useDialogs();
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [meta, setMeta] = useState<{ size: number; updated: string } | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    if (!path) { setLoading(false); return; }
    api.read(path)
      .then((r) => {
        if (r.size_bytes > MAX_INLINE) {
          setReadOnly(true);
          setContent(`[${r.size_bytes} bytes — too large to edit inline]`);
        } else {
          setContent(r.content);
          setOriginal(r.content);
        }
        setMeta({ size: r.size_bytes, updated: r.updated_at });
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Failed to read file'))
      .finally(() => setLoading(false));
  }, [path, toast]);

  const dirty = content !== original && !readOnly;

  const save = async (): Promise<void> => {
    if (!path || readOnly) return;
    const ok = await dialogs.confirm({
      title: 'Save', message: `Overwrite "${path}" with your changes?`,
    });
    if (!ok) return;
    try {
      const res = await api.write(path, content);
      setOriginal(content);
      toast.success(res.created ? 'File created' : 'Saved');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    }
  };

  if (!path) return <div className="editor__empty">No file selected. Open one from the File Manager.</div>;

  return (
    <div className="editor">
      <div className="editor__bar">
        <span className="editor__name">{basename(path)}{dirty ? ' •' : ''}</span>
        <span className="editor__path">{path}</span>
        <div className="fm__spacer" />
        {meta && <span className="editor__meta">{meta.size} B · {new Date(meta.updated).toLocaleString()}</span>}
        <button className="btn-primary" onClick={() => void save()} disabled={!dirty}>Save</button>
      </div>
      {loading ? (
        <div className="editor__empty">Loading…</div>
      ) : (
        <textarea
          className="editor__area"
          value={content}
          readOnly={readOnly}
          spellCheck={false}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); void save(); } }}
        />
      )}
    </div>
  );
}
