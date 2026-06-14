import { useRef, type ReactNode, type PointerEvent } from 'react';
import { wm, type WindowState } from './store';

interface Props {
  win: WindowState;
  isTop: boolean;
  children: ReactNode;
}

/** A draggable, resizable window frame with min/max/close controls. */
export function Window({ win, isTop, children }: Props): JSX.Element {
  const dragOrigin = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const resizeOrigin = useRef<{ px: number; py: number; w: number; h: number } | null>(null);

  const onTitlePointerDown = (e: PointerEvent): void => {
    if (win.maximized) return;
    wm.focus(win.id);
    dragOrigin.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onTitlePointerMove = (e: PointerEvent): void => {
    const o = dragOrigin.current;
    if (!o) return;
    wm.move(win.id, o.x + (e.clientX - o.px), Math.max(28, o.y + (e.clientY - o.py)));
  };
  const endDrag = (): void => { dragOrigin.current = null; };

  const onResizePointerDown = (e: PointerEvent): void => {
    e.stopPropagation();
    wm.focus(win.id);
    resizeOrigin.current = { px: e.clientX, py: e.clientY, w: win.width, h: win.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizePointerMove = (e: PointerEvent): void => {
    const o = resizeOrigin.current;
    if (!o) return;
    wm.resize(win.id, o.w + (e.clientX - o.px), o.h + (e.clientY - o.py));
  };
  const endResize = (): void => { resizeOrigin.current = null; };

  const style: React.CSSProperties = win.maximized
    ? { left: 0, top: 28, width: '100vw', height: 'calc(100vh - 28px - 64px)', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z };

  if (win.minimized) return <></>;

  return (
    <section
      className={`window${isTop ? ' window--active' : ''}`}
      style={style}
      onPointerDown={() => wm.focus(win.id)}
      role="dialog"
      aria-label={win.title}
    >
      <header
        className="window__titlebar"
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={endDrag}
        onDoubleClick={() => wm.toggleMaximize(win.id)}
      >
        <span className="window__icon" aria-hidden>{win.icon}</span>
        <span className="window__title">{win.title}</span>
        <div className="window__controls">
          <button title="Minimize" onClick={() => wm.minimize(win.id)}>—</button>
          <button title="Maximize" onClick={() => wm.toggleMaximize(win.id)}>▢</button>
          <button title="Close" className="window__close" onClick={() => wm.close(win.id)}>✕</button>
        </div>
      </header>
      <div className="window__body">{children}</div>
      {!win.maximized && (
        <div
          className="window__resize"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={endResize}
          aria-hidden
        />
      )}
    </section>
  );
}
