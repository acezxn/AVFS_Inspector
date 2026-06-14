import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AvfsEnvelope } from '@avfs/shared';
import { AvfsAdapter, sanitizeApiError, statusForCode } from './adapter.js';
import { McpError, type McpSession } from './client.js';

function sessionReturning(env: AvfsEnvelope<unknown> | (() => never)): McpSession {
  return {
    agentId: 'agent_x',
    async call() {
      if (typeof env === 'function') env();
      return env as never;
    },
    close() {},
  };
}

test('unwraps a successful envelope into ok:true', async () => {
  const adapter = new AvfsAdapter(
    sessionReturning({ ok: true, data: { path: '/home/agent_x/', entries: [] }, error: null }),
  );
  const res = await adapter.ls({ path: '/home/agent_x/' });
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.data.entries, []);
});

test('maps an AVFS error envelope into ok:false with its code', async () => {
  const adapter = new AvfsAdapter(
    sessionReturning({ ok: false, data: null, error: { code: 'EPERM', message: 'denied' } }),
  );
  const res = await adapter.cat({ path: '/home/other/secret' });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, 'EPERM');
    assert.equal(statusForCode(res.error.code), 403);
  }
});

test('sanitizes permission errors before returning them to the browser', async () => {
  const adapter = new AvfsAdapter(
    sessionReturning({
      ok: false,
      data: null,
      error: {
        code: 'EINVAL',
        message: 'path escapes agent namespace: /home/agent_x/../../agent_y/secret',
      },
    }),
  );
  const res = await adapter.cat({ path: '/home/agent_x/../../agent_y/secret' });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, 'EPERM');
    assert.equal(res.error.message, 'Permission Denied');
    assert.equal(statusForCode(res.error.code), 403);
  }
});

test('sanitizes explicit AVFS permission failures', () => {
  assert.deepEqual(sanitizeApiError('EPERM', 'access denied for /home/agent_y/file'), {
    code: 'EPERM',
    message: 'Permission Denied',
  });
  assert.deepEqual(sanitizeApiError('EACCES', 'cannot read /home/agent_y/file'), {
    code: 'EACCES',
    message: 'Permission Denied',
  });
});

test('turns a thrown McpError into an ok:false result', async () => {
  const adapter = new AvfsAdapter(
    sessionReturning(() => {
      throw new McpError('AVFS unreachable', 'ECONN');
    }),
  );
  const res = await adapter.stat({ path: '/home/agent_x/file' });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, 'ECONN');
    assert.equal(statusForCode(res.error.code), 502);
  }
});

test('statusForCode maps known codes', () => {
  assert.equal(statusForCode('EAUTH'), 401);
  assert.equal(statusForCode('ENOENT'), 404);
  assert.equal(statusForCode('EEXIST'), 409);
  assert.equal(statusForCode('whatever'), 400);
});
