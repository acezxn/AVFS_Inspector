# Project Charter — AVFS_Inspector

## 1. Project Name

**AVFS_Inspector** — a web-based live file-manager dashboard for the Agent Virtual File System (AVFS).

## 2. Background

[AVFS](https://github.com/acezxn/AVFS) provides autonomous LLM agents with a secure, multi-tenant, POSIX-like virtual file system exposed over the Model Context Protocol (MCP). Each agent operates inside a jailed namespace (`/home/<agent_id>/`) with POSIX permissions, ACLs, semantic search, and full audit logging.

Today this file system is consumed only by agents through MCP tool calls. There is no human-friendly way to see what an agent has stored, navigate its directories, or curate its memory. AVFS_Inspector closes that gap.

## 3. Vision

Make an agent's virtual file system as approachable as the personal computer every user already knows. The dashboard **emulates a desktop OS in the browser**: authenticate at a lock screen with an agent token, then work from a desktop of shortcuts and windowed apps that browse, read, edit, and manage the namespace live.

## 4. Objectives

- Provide a **lock-screen login** that authenticates an operator using an agent token against an AVFS MCP server.
- Present a **desktop** with wallpaper, **shortcuts** (including one to the agent's home directory), and a **dock/taskbar**.
- Ship **windowed apps** — File Manager, Editor, Search, Activity — managed by a lightweight in-browser window manager (move/resize/minimize/maximize/close).
- Support the **core file operations** exposed by AVFS MCP tools: `ls`, `cat`, `write`, `mkdir`, `rm`, `mv`, `stat`, `chmod`.
- Expose **AVFS-specific capabilities**: `grep_semantic` search, extended attributes, and `audit_log` viewing.
- Keep the experience **live** — operations reflect current server state, with refresh on demand.

## 5. Scope

### In Scope
- Single-agent session: log in as one agent token, inspect that agent's namespace.
- Browser-based SPA front end (desktop + window manager + apps) plus a thin backend/proxy that speaks MCP to AVFS.
- Desktop shell: lock screen, desktop with shortcuts, dock/taskbar, draggable/resizable windows.
- Core apps: File Manager, Editor, Search, Activity (audit log), plus a Permissions/Properties surface.
- Read and write operations on files, directories, metadata, and permissions.
- Semantic search and audit-log display.
- Token-based authentication (static token at minimum; JWT/mTLS as AVFS supports them).

### Out of Scope (initial release)
- Multi-agent admin console / cross-tenant management.
- Modifying AVFS server configuration or provisioning agents.
- Real-time collaborative editing or multi-user presence.
- Mobile-native applications (responsive web is a stretch goal, not a commitment).
- Offline mode / local caching beyond the active session.

## 6. Stakeholders

| Role | Interest |
|------|----------|
| Agent developers | Debug and inspect agent long-term memory |
| Operators / SREs | Audit activity, curate or clean up stored data |
| Researchers | Observe how agents structure and use memory |
| AVFS maintainers | A reference human client for the MCP surface |

## 7. Success Criteria

- An operator can log in with a valid agent token and immediately browse the namespace root.
- All in-scope MCP operations are reachable through the UI and reflect server state.
- A new user can navigate, read a file, and perform a write/delete without reading documentation.
- Invalid tokens and permission errors are surfaced clearly, never silently.
- The dashboard runs locally per [QUICKSTART.md](QUICKSTART.md) in under 10 minutes of setup.

## 8. Constraints & Assumptions

- AVFS is reachable over MCP (JSON-RPC 2.0) and its tool surface is stable per its documentation.
- The agent token grants exactly the access the underlying agent has — the Inspector never escalates privilege.
- All authorization is enforced server-side by AVFS; the Inspector is a client, not a security boundary.
- The browser cannot speak raw MCP transports directly in all cases, so a backend proxy may be required (see [ARCHITECTURE.md](ARCHITECTURE.md)).

## 9. Risks

| Risk | Mitigation |
|------|------------|
| MCP transport not browser-compatible | Backend proxy translates HTTP ↔ MCP |
| Token leakage in browser | Keep token in backend session; never persist in localStorage by default |
| Destructive operations (`rm`, overwrite) | Confirmation dialogs; surface audit log |
| AVFS tool surface changes | Isolate MCP calls behind a client adapter layer |

## 10. High-Level Milestones

1. **M0 — Docs & scaffolding** (this charter, design, architecture, quickstart).
2. **M1 — Auth & shell** — lock-screen login + `initialize` through proxy; desktop, shortcuts, dock, and window manager.
3. **M2 — File Manager (read-only)** — tree, `ls`, `cat`, `stat` inside a window.
4. **M3 — Write operations** — `write`, `mkdir`, `mv`, `rm`, `chmod`; the Editor app.
5. **M4 — AVFS extras** — Search (`grep_semantic`), Properties xattrs, Activity (`audit_log`).
6. **M5 — Polish** — error handling, confirmations, themes/wallpaper, responsive layout.
