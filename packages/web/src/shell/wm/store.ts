import { useSyncExternalStore } from 'react';

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  icon: string;
  /** App-specific launch props (e.g. initial path for File Manager). */
  props: Record<string, unknown>;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export interface OpenOptions {
  appId: string;
  title: string;
  icon: string;
  props?: Record<string, unknown>;
  width?: number;
  height?: number;
}

let counter = 0;

/**
 * A minimal in-browser window manager. Windows are pure UI affordances —
 * z-order, geometry, focus and min/max state — not OS processes.
 */
class WindowManager {
  private windows: WindowState[] = [];
  private topZ = 1;
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): WindowState[] => this.windows;

  private emit(): void {
    // New array reference so useSyncExternalStore detects the change.
    this.windows = [...this.windows];
    for (const fn of this.listeners) fn();
  }

  open(opts: OpenOptions): string {
    const id = `win_${++counter}`;
    const width = opts.width ?? 720;
    const height = opts.height ?? 480;
    const offset = (this.windows.length % 6) * 28;
    this.windows.push({
      id,
      appId: opts.appId,
      title: opts.title,
      icon: opts.icon,
      props: opts.props ?? {},
      x: 120 + offset,
      y: 90 + offset,
      width,
      height,
      z: ++this.topZ,
      minimized: false,
      maximized: false,
    });
    this.emit();
    return id;
  }

  private patch(id: string, fn: (w: WindowState) => WindowState): void {
    this.windows = this.windows.map((w) => (w.id === id ? fn(w) : w));
    for (const l of this.listeners) l();
  }

  focus(id: string): void {
    this.topZ += 1;
    this.patch(id, (w) => ({ ...w, z: this.topZ, minimized: false }));
  }

  close(id: string): void {
    this.windows = this.windows.filter((w) => w.id !== id);
    this.emit();
  }

  move(id: string, x: number, y: number): void {
    this.patch(id, (w) => ({ ...w, x, y }));
  }

  resize(id: string, width: number, height: number): void {
    this.patch(id, (w) => ({ ...w, width: Math.max(280, width), height: Math.max(180, height) }));
  }

  minimize(id: string): void {
    this.patch(id, (w) => ({ ...w, minimized: true }));
  }

  toggleMaximize(id: string): void {
    this.topZ += 1;
    this.patch(id, (w) => ({ ...w, maximized: !w.maximized, minimized: false, z: this.topZ }));
  }

  setTitle(id: string, title: string): void {
    this.patch(id, (w) => ({ ...w, title }));
  }
}

export const wm = new WindowManager();

export function useWindows(): WindowState[] {
  return useSyncExternalStore(wm.subscribe, wm.getSnapshot, wm.getSnapshot);
}
