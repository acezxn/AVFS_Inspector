import { useState } from 'react';
import { useSession, ApiError } from '../session/SessionContext';

export function LockScreen(): JSX.Element {
  const { login } = useSession();
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await login(token.trim(), serverUrl.trim() || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lock">
      <form className="lock__card" onSubmit={submit}>
        <h1 className="lock__title">AVFS Inspector</h1>
        <p className="lock__subtitle">Sign in with your agent token</p>

        <input
          className="lock__input"
          type="password"
          placeholder="Agent token"
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <input
          className="lock__input lock__input--muted"
          type="text"
          placeholder="Server URL (optional)"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
        />

        {error && <div className="lock__error">{error}</div>}

        <button className="lock__submit" disabled={busy || !token.trim()}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
      <div className="lock__hint">Your token is held server-side and never stored in the browser.</div>
    </div>
  );
}
