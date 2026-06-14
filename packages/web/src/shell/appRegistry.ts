import type { ComponentType } from 'react';
import type { WindowState } from './wm/store';
import { wm } from './wm/store';
import { FileManager } from '../apps/FileManager/FileManager';
import { Editor } from '../apps/Editor/Editor';
import { Search } from '../apps/Search/Search';
import { Activity } from '../apps/Activity/Activity';
import { Permissions } from '../apps/Permissions/Permissions';

/** Every app component receives its own window state. */
export interface AppProps {
  win: WindowState;
}

export interface AppDef {
  id: string;
  title: string;
  icon: string;
  component: ComponentType<AppProps>;
  width: number;
  height: number;
  /** Whether the app appears as a dock launcher. */
  pinned: boolean;
}

export const APPS: Record<string, AppDef> = {
  'file-manager': {
    id: 'file-manager', title: 'File Manager', icon: '🗂', component: FileManager,
    width: 760, height: 500, pinned: true,
  },
  editor: {
    id: 'editor', title: 'Editor', icon: '📝', component: Editor,
    width: 720, height: 520, pinned: true,
  },
  search: {
    id: 'search', title: 'Search', icon: '🔍', component: Search,
    width: 620, height: 480, pinned: true,
  },
  activity: {
    id: 'activity', title: 'Activity', icon: '🕑', component: Activity,
    width: 680, height: 460, pinned: true,
  },
  permissions: {
    id: 'permissions', title: 'Properties', icon: '🔐', component: Permissions,
    width: 480, height: 440, pinned: false,
  },
};

/** Launch an app window, optionally with props and a title override. */
export function launchApp(
  appId: string,
  props: Record<string, unknown> = {},
  titleOverride?: string,
): string {
  const def = APPS[appId];
  if (!def) throw new Error(`Unknown app: ${appId}`);
  return wm.open({
    appId: def.id,
    title: titleOverride ?? def.title,
    icon: def.icon,
    props,
    width: def.width,
    height: def.height,
  });
}
