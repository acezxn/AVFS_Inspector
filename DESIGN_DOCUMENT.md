# Design Document — AVFS_Inspector

This document describes the user experience and functional design of AVFS_Inspector. For the technical/system design, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Design Goals

1. **Familiarity** — the dashboard *emulates a computer*: a lock-screen login, a desktop with shortcuts, and windowed apps. Anyone who has used a desktop OS should feel at home.
2. **Liveness** — what you see reflects the current state of the AVFS namespace.
3. **Safety** — destructive actions are deliberate, confirmed, and auditable.
4. **Transparency** — AVFS-specific concepts (permissions, ACLs, semantic search, audit) are surfaced as first-class apps, not hidden.

## 2. The Computer Metaphor

AVFS_Inspector presents the agent's virtual file system as a **desktop operating system in the browser**:

- A **lock screen** authenticates the operator with an agent token.
- A **desktop** with wallpaper holds **shortcuts** — most prominently a shortcut to the agent's **home directory** (`/home/<agent_id>/`).
- A **dock / taskbar** launches and switches between **apps**.
- Each app opens in a **window** that can be moved, resized, minimized, maximized, and closed — managed by a lightweight in-browser window manager.

The agent's namespace *is* the computer's disk; the apps are the tools for working with it.

## 3. User Personas

- **Dev Dana** — building an agent, wants to verify what it wrote to memory and clean up test data.
- **Ops Omar** — audits agent behavior, reviews the audit log and permission bits.
- **Researcher Rin** — explores how agents organize memory, uses semantic search heavily.

## 4. Primary User Flows

### 4.1 Login (lock screen)
1. User lands on a **computer-style lock screen**: blurred wallpaper, centered card, agent avatar/icon, a single token field ("Agent Token"), and an optional "Server URL" field.
2. User pastes the agent token and submits.
3. Inspector performs the MCP `initialize` handshake to authenticate and bind identity.
4. On success → the screen "unlocks" into the **desktop**, rooted at the agent's namespace.
5. On failure → inline error ("Invalid token" / "Server unreachable"), field stays focused.
6. **Log out / lock** returns to this screen and drops the session.

### 4.2 Desktop
1. After unlocking, the user sees a **desktop** with wallpaper, desktop **shortcuts**, and a **dock/taskbar**.
2. Default desktop shortcuts:
   - **🏠 Home** — opens the File Manager at `/home/<agent_id>/`.
   - **🗂 File Manager**, **📝 Editor**, **🔍 Search**, **🕑 Activity** — launch the corresponding apps.
3. Double-click (or single-tap) a shortcut to launch its app.
4. The dock shows pinned apps and running apps; clicking focuses or launches.
5. A **status/menu bar** (top or in the dock) shows the connection indicator, `agent_id`, clock, and a logout/lock control.

### 4.3 Windowing
1. Apps open as **windows** with a title bar (app name + path/title), and **minimize / maximize / close** controls.
2. Windows are **draggable** by the title bar and **resizable** from edges/corners.
3. Clicking a window brings it to front (focus); the focused window's taskbar entry is highlighted.
4. Minimized windows collapse to the taskbar; closing a window ends that app instance.
5. Multiple windows of the same app are allowed (e.g., two editor windows).

## 5. Apps

Each app is a focused tool backed by AVFS MCP calls. v1 ships the first four; the rest are stretch.

### 5.1 File Manager (core)
The primary app and the target of the Home shortcut.
- **Sidebar** directory tree (lazy-loaded via `ls`).
- **Content pane**: current directory's entries as icons or a detail list; breadcrumb bar; view toggle and refresh.
- **Navigate:** double-click folder → `ls`; double-click file → open in Editor (or preview).
- **Operations:** New File (`write`), New Folder (`mkdir`), Rename/Move/drag-drop (`mv`), Delete (`rm`, with confirmation).
- **Context menu** per item: Open, Open in Editor, Rename, Delete, Properties.
- **Properties** opens the Permissions app/dialog for that inode.

### 5.2 Text Editor (core)
- Opens a file's content via `cat`; renders text inline.
- Edit and **Save** issues `write` (overwrite) with an overwrite confirmation.
- Save As / New File creates a new inode.
- Large/binary files: read-only notice with size and a raw/download option.
- Metadata strip shows `stat` info (size, mode, owner, timestamps).

### 5.3 Semantic Search (core)
- A query box issuing `grep_semantic` across the namespace.
- Ranked results with snippets and paths; clicking a result opens it in the File Manager or Editor.
- Toggle between **path filter** (lexical) and **semantic** modes.

### 5.4 Activity / Audit Log (core)
- Chronological feed of `audit_log` entries (timestamp, action, path, result).
- Filterable by path or action; optional live updates.

### 5.5 Permissions / Properties (core dialog or app)
- Shows POSIX mode bits and ACLs; editing applies `chmod`.
- **Extended Attributes** tab lists xattrs (`listxattr`) with get/set/remove (`getxattr`/`setxattr`/`removexattr`).

### 5.6 Terminal (stretch)
- A shell-like console mapping commands (`ls`, `cat`, `rm`, `mv`, `mkdir`, `stat`, `chmod`) to MCP tools, for power users. Read-first; destructive commands confirm.

### 5.7 Trash (stretch)
- If AVFS models soft-delete, a recoverable bin; otherwise `rm` is permanent and the Trash app is omitted.

## 6. Layout & Information Architecture

### Desktop
```
┌───────────────────────────────────────────────────────────┐
│  Menu bar:  AVFS_Inspector   agent_x   ● connected   12:04 ⏻│
├───────────────────────────────────────────────────────────┤
│   🏠            🗂            📝            🔍               │
│  Home      File Mgr      Editor       Search                │
│                                                             │
│   🕑                                                        │
│  Activity            ┌───────────────────────────┐         │
│                      │ 🗂 File Manager — /home/.. │ ☐ ▢ ✕  │
│   (wallpaper)        ├───────────────────────────┤         │
│                      │ sidebar │  content pane    │         │
│                      └───────────────────────────┘         │
├───────────────────────────────────────────────────────────┤
│  Dock:  🗂  📝  🔍  🕑   │   (running) 🗂        │ Status ● │
└───────────────────────────────────────────────────────────┘
```

### File Manager window
```
┌─ 🗂 File Manager — /home/agent_x/notes ──────────── ☐ ▢ ✕ ┐
│  [⌂ home › notes]            [search ▾] [view ⊞/≣] [↻]     │
├───────────────┬───────────────────────────────────────────┤
│  ▾ home       │   📁 drafts   📄 plan.md   📄 todo.txt     │
│    ▾ agent_x  │   📄 cache.json                            │
│      notes ◀  │                                            │
│      scratch  │                                            │
└───────────────┴───────────────────────────────────────────┘
```

## 7. Visual Design

- **Theme:** clean, neutral OS-like chrome; light and dark modes; wallpaper behind the desktop.
- **Lock screen:** evokes a computer lock screen — blurred backdrop, centered card, single primary action.
- **Desktop shortcuts:** large icon + label; selectable and double-clickable.
- **Windows:** subtle shadow, rounded corners, clear title bar with traffic-light or standard min/max/close controls.
- **Icons:** file-type-aware (folder, text, json, binary, unknown) and per-app icons.
- **Feedback:** toasts for operation success/failure; spinners for in-flight MCP calls; optimistic UI where safe, reconciled against server response.

## 8. States & Edge Cases

| Situation | Behavior |
|-----------|----------|
| Empty directory | Friendly empty state with "New File/Folder" affordances |
| Permission denied | Inline error from AVFS surfaced verbatim plus a plain-language hint |
| Large file | Truncated preview with byte count and "download/raw" option |
| Binary file | No inline render; show metadata + size summary |
| Token expired mid-session | Desktop locks; lock screen prompts re-authentication |
| Network/server down | Status indicator turns red; operations rejected, not silently dropped |
| Destructive op | Modal confirmation naming the exact target path |
| No windows open | Bare desktop with shortcuts and dock |

## 9. Mapping: UI Action → AVFS MCP Tool

| UI action | App | MCP tool |
|-----------|-----|----------|
| Open folder / refresh | File Manager | `ls` |
| Open / preview file | File Manager / Editor | `cat` |
| Save / create file | Editor / File Manager | `write` |
| New folder | File Manager | `mkdir` |
| Delete | File Manager | `rm` |
| Rename / move / drag-drop | File Manager | `mv` |
| Properties metadata | Properties | `stat` |
| Edit permissions/ACL | Permissions | `chmod` |
| Extended attributes | Permissions | `getxattr` / `setxattr` / `listxattr` / `removexattr` |
| Semantic search | Search | `grep_semantic` |
| Activity feed | Activity | `audit_log` |

## 10. Accessibility

- Full keyboard navigation: desktop icons and file lists via arrow keys; Enter to open; F2 rename; Del to delete.
- Windows are keyboard-focusable; Esc closes dialogs; standard focus order within apps.
- ARIA roles for the desktop (application), windows (dialog), tree, and grid.
- Color is never the only signal (icons + text for status).

## 11. Non-Goals (UX)

- No real multitasking OS internals — windows are a UI affordance, not processes.
- No theme builder beyond light/dark and wallpaper.
- No mobile-native app (responsive web is a stretch goal); the desktop metaphor targets larger screens first.
