import { useEffect, useState } from 'react';
import { useSession } from '../session/SessionContext';

export function MenuBar(): JSX.Element {
  const { session, logout } = useSession();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="menubar">
      <span className="menubar__brand">AVFS Inspector</span>
      <span className="menubar__agent">{session?.agentId}</span>
      <span className="menubar__status" title="Connected">
        <span className="menubar__dot" /> connected
      </span>
      <div className="menubar__spacer" />
      <span className="menubar__clock">{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      <button className="menubar__logout" title="Lock / log out" onClick={() => void logout()}>⏻</button>
    </header>
  );
}
