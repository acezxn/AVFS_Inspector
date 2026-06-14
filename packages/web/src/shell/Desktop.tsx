import { APPS, launchApp } from './appRegistry';
import { useWindows } from './wm/store';
import { Window } from './wm/Window';
import { MenuBar } from './MenuBar';
import { Dock } from './Dock';
import { useSession } from '../session/SessionContext';

interface Shortcut {
  label: string;
  icon: string;
  onOpen: () => void;
}

export function Desktop(): JSX.Element {
  const { session } = useSession();
  const windows = useWindows();
  const topZ = Math.max(0, ...windows.map((w) => w.z));

  const shortcuts: Shortcut[] = [
    { label: 'Home', icon: '🏠', onOpen: () => launchApp('file-manager', { path: session?.root }, 'Home') },
    { label: 'File Manager', icon: APPS['file-manager'].icon, onOpen: () => launchApp('file-manager') },
    { label: 'Editor', icon: APPS.editor.icon, onOpen: () => launchApp('editor') },
    { label: 'Search', icon: APPS.search.icon, onOpen: () => launchApp('search') },
    { label: 'Activity', icon: APPS.activity.icon, onOpen: () => launchApp('activity') },
  ];

  return (
    <div className="desktop">
      <MenuBar />

      <div className="desktop__surface">
        <ul className="desktop__shortcuts">
          {shortcuts.map((s) => (
            <li key={s.label}>
              <button className="shortcut" onDoubleClick={s.onOpen} onKeyDown={(e) => { if (e.key === 'Enter') s.onOpen(); }}>
                <span className="shortcut__icon" aria-hidden>{s.icon}</span>
                <span className="shortcut__label">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {windows.map((win) => {
          const App = APPS[win.appId]?.component;
          if (!App) return null;
          return (
            <Window key={win.id} win={win} isTop={win.z === topZ}>
              <App win={win} />
            </Window>
          );
        })}
      </div>

      <Dock />
    </div>
  );
}
