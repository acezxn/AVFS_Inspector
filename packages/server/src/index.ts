import express from 'express';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { fsRouter } from './routes/fs.js';
import { searchRouter } from './routes/search.js';
import { auditRouter } from './routes/audit.js';

const app = express();
app.use(express.json({ limit: '8mb' }));

// CORS for the SPA dev origin (credentials so the session cookie flows).
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.webOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return void res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, data: { status: 'up' } }));
app.use('/api', authRouter);
app.use('/api/fs', fsRouter);
app.use('/api/search', searchRouter);
app.use('/api/audit', auditRouter);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[avfs-inspector] proxy listening on http://localhost:${config.port}`);
  console.log(`[avfs-inspector] AVFS transport: ${config.mcp.transport}`);
});
