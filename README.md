# AVFS_Inspector

<img width="1780" height="873" alt="Screenshot 2026-06-14 at 2 36 20 PM" src="https://github.com/user-attachments/assets/c0afec40-2cdc-43d9-ba33-b8c59777681e" />

A web-based live dashboard that turns an [AVFS (Agent Virtual File System)](https://github.com/acezxn/AVFS) namespace into a familiar, browsable file manager — right in your browser.

AVFS is a secure, multi-tenant, POSIX-like virtual file system that serves as long-term memory for autonomous LLM agents, exposed over the Model Context Protocol (MCP). **AVFS_Inspector** turns that file system into a **computer you can use in your browser**: log in at a lock screen with an agent token, then work with the agent's jailed `/home/<agent_id>/` namespace from a desktop full of shortcuts and windowed apps.

## The computer metaphor

AVFS_Inspector emulates a desktop operating system:

- **Lock screen** — a computer-style login where you paste your agent token to authenticate against the AVFS MCP server.
- **Desktop** — wallpaper plus **shortcuts**, most prominently one to the agent's **home directory**, alongside app launchers.
- **Dock / taskbar** — launch and switch between apps; windows can be moved, resized, minimized, maximized, and closed.

## Apps

- **🗂 File Manager** — directory tree, breadcrumbs, icon/list views: list (`ls`), read (`cat`), write, `mkdir`, move/rename (`mv`), delete (`rm`).
- **📝 Editor** — open, edit, and save files (`cat` / `write`) with a metadata strip (`stat`).
- **🔍 Search** — content-aware retrieval across the namespace (`grep_semantic`).
- **🕑 Activity** — the agent's audit history (`audit_log`).
- **Properties / Permissions** — POSIX mode bits, ACLs (`chmod`), and extended attributes.

## Why

Agent memory is normally invisible. AVFS_Inspector gives operators, developers, and researchers a direct, safe, read/write window into what an agent has stored — for debugging, auditing, and curation.

## Quick Setup

```bash
npm install
cp .env.example .env
npm run dev
```

By default, Inspector expects an AVFS HTTP MCP server at `http://127.0.0.1:8765`, serves the backend API on `http://localhost:3000`, and serves the Vite app on `http://localhost:5173`.

Open the Vite URL, then sign in with an agent token. For stdio transport, custom ports, deployment notes, and troubleshooting, see [QUICKSTART.md](QUICKSTART.md).

## Documentation

| Document | Purpose |
|----------|---------|
| [CHARTER.md](CHARTER.md) | Goals, scope, stakeholders, success criteria |
| [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md) | UX and functional design |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture and data flow |
| [QUICKSTART.md](QUICKSTART.md) | Get it running locally |

## Status

Early development. See [CHARTER.md](CHARTER.md) for scope.
