# Architecture — AVFS_Inspector

This document covers the technical architecture. For the user-facing design see [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md).

## 1. Overview

AVFS_Inspector is a browser front end backed by a thin server that proxies the browser to an [AVFS](https://github.com/acezxn/AVFS) MCP server. AVFS speaks the Model Context Protocol (JSON-RPC 2.0) and enforces all authentication, authorization, and tenant isolation server-side. The Inspector is purely a **client**: it never bypasses or re-implements AVFS's security model.

```
┌──────────────┐     HTTP/WS      ┌────────────────┐     MCP (JSON-RPC 2.0)   ┌──────────────┐
│   Browser    │ ───────────────▶ │  Inspector     │ ───────────────────────▶ │  AVFS MCP    │
│   SPA (UI)   │ ◀─────────────── │  Backend/Proxy │ ◀─────────────────────── │  Server      │
└──────────────┘   JSON / events  └────────────────┘    tools/call results    └──────┬───────┘
                                                                                       │
                                                          ┌────────────────────────────┼───────────┐
                                                          │  Relational DB (inodes,     │ Vector    │
                                                          │  ACLs, audit log)           │ index     │
                                                          └─────────────────────────────┴───────────┘
```

## 2. Why a backend proxy

AVFS authenticates a session via an MCP `initialize` call and then binds identity to subsequent `tools/call` requests. Browsers cannot always speak the MCP transport directly (stdio is impossible; some servers expose only non-CORS HTTP/SSE). The backend proxy:

- Performs the MCP `initialize` handshake and holds the authenticated session.
- Keeps the **agent token server-side**, out of browser storage, mitigating token leakage.
- Translates a simple browser-facing HTTP/WebSocket API into MCP `tools/call` invocations.
- Centralizes retries, error normalization, and rate limiting.

> If a deployment's AVFS server exposes a CORS-enabled streamable-HTTP MCP endpoint, a "direct mode" can let the SPA talk to it without the proxy. The proxy remains the default for security and compatibility.

## 3. Components

### 3.1 Front end (SPA — desktop shell + apps)
- **Stack:** TypeScript + a component framework (React/Vue/Svelte — implementer's choice), bundled with Vite.
- **Responsibilities:** rendering the **desktop OS metaphor** (lock screen → desktop → windowed apps), local navigation state, optimistic updates, and calling the Inspector backend API.
- **Shell architecture:**
  - **Lock screen** — token entry; gates entry to the desktop.
  - **Desktop** — wallpaper, shortcut icons (incl. the Home shortcut), dock/taskbar, menu/status bar.
  - **Window manager** — a store of open windows with z-order/focus, position/size, and minimize/maximize/close state; renders each app inside a draggable, resizable window frame. Windows are pure UI affordances, not OS processes.
  - **App registry** — declarative list of apps (id, title, icon, component, default size). The desktop, dock, and shortcuts launch apps by id; multiple instances of an app are allowed.
- **Key modules:**
  - `auth/` — lock screen, token submission, session lifecycle.
  - `shell/` — desktop, dock, menu bar, window manager, app registry.
  - `apps/` — File Manager, Editor, Search, Activity, Permissions (each a self-contained app component).
  - `fs/` — file-system model, path utilities, tree/list state (shared across apps).
  - `api/` — typed client for the Inspector backend.

### 3.2 Backend / proxy
- **Stack:** Node.js (TypeScript) is the reference; any language with an MCP client works.
- **Responsibilities:**
  - Session management: one Inspector session ↔ one authenticated AVFS MCP session.
  - MCP client: opens the connection, runs `initialize`, issues `tools/call`.
  - API surface for the SPA (see §5).
  - Error mapping (MCP/JSON-RPC errors → HTTP status + structured body).
- **MCP adapter layer** isolates all AVFS tool calls so a change in the AVFS tool surface touches one module.

### 3.3 AVFS MCP server (external)
- Provided by the AVFS project. Stores inodes, permissions, and audit logs in a relational DB; provides semantic search via a vector index. Not part of this repository.

## 4. Authentication & session flow

```
Browser              Inspector Backend                 AVFS MCP Server
   │  POST /login {token, serverUrl}                        │
   │ ─────────────────────▶                                 │
   │                       │  initialize (Bearer token)     │
   │                       │ ──────────────────────────────▶│
   │                       │  ok (no identity in result)    │
   │                       │ ◀──────────────────────────────│
   │                       │  tools/call whoami (Bearer)    │
   │                       │ ──────────────────────────────▶│
   │                       │  { agent_id }                  │
   │                       │ ◀──────────────────────────────│
   │  200 {sessionId, agentId, root}                        │
   │ ◀─────────────────────                                 │
   │  (sessionId in httpOnly cookie)                        │
```

- The agent **token** is sent once to the backend. Over the http transport AVFS reads it from the `Authorization: Bearer <token>` header on every request (http is stateless; identity is re-derived per request from the credential). The backend stores the live MCP session and issues the browser an opaque `sessionId` (httpOnly, sameSite cookie). The raw token is never returned to the browser.
- AVFS's `initialize` does **not** return the agent identity, so the backend calls the **`whoami`** tool immediately after to learn the bound `agent_id` (and derive the namespace root). This is isolated in `authenticate()` in `mcp/client.ts`.
- AVFS supports static token, JWT, and mTLS providers; the backend passes the login token using the mechanism implied by `AVFS_MCP_TRANSPORT`: http uses `AVFS_AUTH_HEADER`, stdio uses the `initialize` credentials object.
- Session expiry / auth failure → backend returns 401 → SPA routes back to login.

## 5. Inspector Backend API (browser-facing)

A small REST-ish surface that maps 1:1 onto AVFS tools. All routes require a valid `sessionId`.

| Method & path | AVFS tool | Notes |
|---------------|-----------|-------|
| `POST /login` | `initialize` | Returns session, agentId, namespace root |
| `POST /logout` | — | Drops the MCP session |
| `GET /fs/list?path=` | `ls` | Directory entries |
| `GET /fs/read?path=` | `cat` | File content (streamed/truncated) |
| `PUT /fs/write` | `write` | Body: path + content |
| `POST /fs/mkdir` | `mkdir` | |
| `DELETE /fs/rm?path=` | `rm` | Requires confirm flag |
| `POST /fs/mv` | `mv` | from/to paths |
| `GET /fs/stat?path=` | `stat` | Metadata |
| `POST /fs/chmod` | `chmod` | mode bits / ACL |
| `GET/POST/DELETE /fs/xattr` | `getxattr`/`setxattr`/`listxattr`/`removexattr` | |
| `GET /search?q=&mode=semantic` | `grep_semantic` | Ranked results |
| `GET /audit?path=&action=` | `audit_log` | Activity feed |

Responses are normalized JSON: `{ ok, data?, error? }` with `error: { code, message, path? }`.

## 6. Data model (client-side)

```ts
interface Inode {
  path: string;
  inode_id: string;
  type: "file" | "directory";  // AVFS uses these literal strings
  owner: string;               // agent_id
  mode: string;                // octal string, e.g. "600"
  size_bytes: number;
  created_at: string;
  updated_at: string;
  xattrs: string[];            // attribute names; fetch values via getxattr
}
```
(The canonical definitions live in `@avfs/shared`.)

The client treats the namespace as a tree of `Inode`s, lazily hydrated by `ls`/`stat`. No assumption is made about server-side storage; the relational/vector split is entirely AVFS's concern.

## 7. Cross-cutting concerns

- **Security:** token stays server-side; httpOnly session cookie; AVFS remains the sole authorization authority. The proxy validates path inputs lexically before forwarding (defense in depth), but AVFS performs the authoritative normalization.
- **Error handling:** every MCP error is surfaced to the user — never swallowed. Distinguish auth (401), permission (403-equivalent), not-found (404), and server (5xx).
- **Liveness:** the SPA refetches on navigation and on an explicit refresh; optional WebSocket channel can push `audit_log` updates for a live activity feed.
- **Destructive safety:** `rm` and overwriting `write` require an explicit confirm flag from the client, enforced at the API layer.
- **Observability:** backend logs each proxied tool call (correlation id, agentId, tool, latency, result) without logging file contents or tokens.

## 8. Deployment

- **Dev:** SPA via Vite dev server + backend via `ts-node`/`tsx`, pointed at a local AVFS instance (see [QUICKSTART.md](QUICKSTART.md)).
- **Prod:** SPA built to static assets served by the backend (or a CDN); backend as a small container. Configuration via environment variables (`AVFS_MCP_TRANSPORT`, `AVFS_MCP_HTTP_URL` or stdio command settings, `AVFS_AUTH_HEADER`, `INSPECTOR_SESSION_SECRET`, `INSPECTOR_API_PORT`).

## 9. Technology summary

| Layer | Choice (reference) |
|-------|--------------------|
| Front end | TypeScript, React/Vue/Svelte, Vite |
| Backend | Node.js + TypeScript, an MCP client library |
| Transport (browser↔backend) | HTTP + optional WebSocket |
| Transport (backend↔AVFS) | MCP (JSON-RPC 2.0) |
| Auth | Agent token (static/JWT/mTLS) via AVFS `initialize` |

## 10. Extensibility

- The **MCP adapter** is the single integration point — new AVFS tools become new adapter methods + API routes.
- **Direct mode** (SPA → CORS MCP endpoint) can be added behind a flag for trusted deployments.
- Multi-agent admin features (out of scope for v1) would layer on a session registry, not change the core proxy.
