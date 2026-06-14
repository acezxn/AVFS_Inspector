import { useCallback, useEffect, useState } from 'react';
import type { AuditEvent } from '@avfs/shared';
import type { AppProps } from '../../shell/appRegistry';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../ui/toast';

const PAGE = 50;
const OPERATIONS = ['', 'ls', 'cat', 'write', 'mkdir', 'rm', 'mv', 'stat', 'chmod', 'grep_semantic'];

export function Activity(_props: AppProps): JSX.Element {
  const toast = useToast();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [operation, setOperation] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (off: number, op: string) => {
    setLoading(true);
    try {
      const res = await api.audit(PAGE, off, op || undefined);
      setEvents(res.events);
      setTotal(res.total);
      setOffset(off);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(0, operation); }, [operation, load]);

  return (
    <div className="activity">
      <div className="activity__bar">
        <label>
          Operation:{' '}
          <select value={operation} onChange={(e) => setOperation(e.target.value)}>
            {OPERATIONS.map((op) => <option key={op} value={op}>{op || 'all'}</option>)}
          </select>
        </label>
        <button onClick={() => void load(offset, operation)}>↻ Refresh</button>
        <div className="fm__spacer" />
        <span className="activity__count">{total} events</span>
      </div>

      <div className="activity__list">
        {loading && <div className="fm__empty">Loading…</div>}
        {!loading && events.length === 0 && <div className="fm__empty">No activity.</div>}
        <table className="activity__table">
          <tbody>
            {events.map((ev, i) => (
              <tr key={`${ev.ts}-${i}`} className={ev.status === 'ok' ? '' : 'activity__row--err'}>
                <td className="activity__time">{new Date(ev.ts).toLocaleString()}</td>
                <td className="activity__op">{ev.operation}</td>
                <td className="activity__path">{ev.path}</td>
                <td className="activity__result">{ev.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="activity__pager">
        <button disabled={offset === 0} onClick={() => void load(Math.max(0, offset - PAGE), operation)}>‹ Prev</button>
        <span>{offset + 1}–{Math.min(offset + PAGE, total)}</span>
        <button disabled={offset + PAGE >= total} onClick={() => void load(offset + PAGE, operation)}>Next ›</button>
      </div>
    </div>
  );
}
