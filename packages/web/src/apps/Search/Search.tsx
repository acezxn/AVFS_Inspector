import { useState } from 'react';
import type { SearchHit } from '@avfs/shared';
import type { AppProps } from '../../shell/appRegistry';
import { launchApp } from '../../shell/appRegistry';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../ui/toast';
import { basename, parent } from '../../fs/paths';

export function Search(_props: AppProps): JSX.Element {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (): Promise<void> => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const res = await api.search(query.trim());
      setHits(res.results);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Search failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="search">
      <form
        className="search__bar"
        onSubmit={(e) => { e.preventDefault(); void run(); }}
      >
        <input
          className="search__input"
          placeholder="Semantic search across the namespace…"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-primary" disabled={busy}>{busy ? '…' : 'Search'}</button>
      </form>

      <div className="search__results">
        {hits === null && <div className="fm__empty">Enter a query to search semantically.</div>}
        {hits?.length === 0 && <div className="fm__empty">No matches.</div>}
        {hits?.map((h) => (
          <div key={h.inode_id} className="search__hit">
            <div className="search__hit-head">
              <button className="search__hit-path" onClick={() => launchApp('editor', { path: h.path }, basename(h.path))}>
                {h.path}
              </button>
              <span className="search__score">{h.score.toFixed(3)}</span>
              <button
                className="search__reveal"
                title="Reveal in File Manager"
                onClick={() => launchApp('file-manager', { path: parent(h.path) })}
              >
                🗂
              </button>
            </div>
            <p className="search__excerpt">{h.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
