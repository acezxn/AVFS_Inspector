# Quickstart — AVFS_Inspector

Get AVFS_Inspector running locally against an AVFS MCP server.

## 1. Prerequisites

- Node.js 20+.
- npm. The repo is configured with npm workspaces.
- A running AVFS MCP server, or an AVFS binary/config that Inspector can launch over stdio.
- An agent token for the namespace you want to inspect.

The agent token is not stored in `.env`. Enter it on the lock screen after the app starts.

## 2. Install

```bash
git clone <your-AVFS_Inspector-repo-url>
cd AVFS_Inspector
npm install
cp .env.example .env
```

## 3. Choose AVFS Transport

Recommended local setup: connect to a running AVFS HTTP MCP server.

```bash
AVFS_MCP_TRANSPORT=http
AVFS_MCP_HTTP_URL=http://127.0.0.1:8765
AVFS_AUTH_HEADER=Authorization
```

Alternative setup: let the Inspector backend spawn AVFS over stdio.

```bash
AVFS_MCP_TRANSPORT=stdio
AVFS_MCP_COMMAND=./bin/avfs
AVFS_MCP_ARGS=serve,--config,avfs.yaml
```

`AVFS_MCP_ARGS` is comma-separated because it is parsed into argv. For example, `serve,--config,avfs.yaml` becomes `["serve", "--config", "avfs.yaml"]`.

## 4. Configure Inspector

Use the `INSPECTOR_*` variables for the app itself:

```bash
INSPECTOR_API_PORT=3000
INSPECTOR_WEB_PORT=5173
INSPECTOR_WEB_ORIGIN=http://localhost:5173
INSPECTOR_SESSION_SECRET=change-me-to-a-long-random-string
INSPECTOR_SESSION_TTL_MS=1800000
```

Keep `INSPECTOR_WEB_ORIGIN` aligned with `INSPECTOR_WEB_PORT`. The backend uses it for CORS during development.

Legacy aliases still work for existing deployments: `PORT`, `SESSION_SECRET`, `SESSION_TTL_MS`, and `WEB_ORIGIN`.

## 5. Run Locally

```bash
npm run dev
```

This starts:

- Backend API: `http://localhost:3000` by default.
- Vite web app: `http://localhost:5173` by default.

Open the URL printed by Vite.

## 6. Log In

1. Paste your agent token on the lock screen.
2. Leave **Server URL** blank unless you want to override `AVFS_MCP_HTTP_URL` for this login.
3. Submit. The backend authenticates with AVFS and opens the desktop rooted at `/home/<agent_id>/`.

The Server URL override only applies to HTTP transport. In stdio mode, the configured command and args are used.

## 7. Production Build

```bash
npm run build
npm run start --workspace @avfs/server
```

The backend serves the API. The built SPA is emitted to `packages/web/dist`; serve it with your static host, CDN, reverse proxy, or deployment platform and proxy `/api` to the backend.

Set production environment variables in the deployment environment, at minimum:

```bash
AVFS_MCP_TRANSPORT=http
AVFS_MCP_HTTP_URL=https://your-avfs-mcp-endpoint
INSPECTOR_API_PORT=3000
INSPECTOR_SESSION_SECRET=<long-random-secret>
INSPECTOR_WEB_ORIGIN=https://your-inspector-web-origin
```

Run behind HTTPS so the session cookie is protected.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Login says AVFS is unreachable | `AVFS_MCP_HTTP_URL` is wrong, AVFS is stopped, or stdio command cannot launch | Check AVFS logs and verify the configured transport |
| Login says invalid token | Token expired or for another auth provider | Re-issue the agent token |
| Browser shows CORS errors | `INSPECTOR_WEB_ORIGIN` does not match the Vite URL | Match it to `http://localhost:<INSPECTOR_WEB_PORT>` |
| API and web dev server collide on a port | Legacy `PORT` is set globally | Prefer `INSPECTOR_API_PORT` and `INSPECTOR_WEB_PORT` |
| Empty namespace | Agent has not written files yet | Create a file from File Manager to confirm write access |
| 401 mid-session | Session idle timeout elapsed | Log in again or increase `INSPECTOR_SESSION_TTL_MS` |

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for the proxy and API details.
- Read [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md) for the full UX.
- See [CHARTER.md](CHARTER.md) for scope and milestones.
