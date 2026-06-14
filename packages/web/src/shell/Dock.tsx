import { APPS, launchApp } from './appRegistry';
import { wm, useWindows } from './wm/store';

export function Dock(): JSX.Element {
  const windows = useWindows();
  const running = new Set(windows.map((w) => w.appId));

  return (
    <nav className="dock" aria-label="Dock">
      {Object.values(APPS).filter((a) => a.pinned).map((app) => (
        <button
          key={app.id}
          className={`dock__app${running.has(app.id) ? ' dock__app--running' : ''}`}
          title={app.title}
          onClick={() => launchApp(app.id)}
        >
          <span className="dock__icon" aria-hidden>{app.icon}</span>
          <span className="dock__label">{app.title}</span>
        </button>
      ))}

      {windows.length > 0 && <span className="dock__divider" />}

      {windows.map((w) => (
        <button
          key={w.id}
          className={`dock__win${w.minimized ? ' dock__win--min' : ''}`}
          title={w.title}
          onClick={() => (w.minimized ? wm.focus(w.id) : wm.minimize(w.id))}
        >
          <span className="dock__icon" aria-hidden>{w.icon}</span>
        </button>
      ))}
    </nav>
  );
}
