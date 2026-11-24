import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('production serves frontend pages, API responses, and missing assets correctly', async (t) => {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    PORT: '0',
    CLIENT_URL: 'http://127.0.0.1',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/spendwise_routing_test',
    JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
  });

  const { default: app } = await import('../dist/app.js');
  const index = await readFile(new URL('../../frontend/dist/index.html', import.meta.url), 'utf8');
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browserRequest = { headers: { Accept: 'text/html' } };

  for (const path of ['/', '/transactions']) {
    const response = await fetch(origin + path, browserRequest);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(await response.text(), index, path);
  }

  const health = await fetch(origin + '/health', browserRequest);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });

  for (const [path, status] of [
    ['/api/auth/me', 401],
    ['/api/missing-route', 404],
    ['/assets/missing-file.js', 404],
  ]) {
    const response = await fetch(origin + path, browserRequest);
    assert.equal(response.status, status, path);
    assert.match(response.headers.get('content-type'), /application\/json/, path);
  }
});
