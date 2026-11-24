import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import mongoose from 'mongoose';

test('signed-in CSV imports skip duplicates within and across uploads', async (t) => {
  const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = 'spendwise_csv_test_' + randomUUID().replaceAll('-', '');
  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '0',
    CLIENT_URL: 'http://127.0.0.1',
    MONGODB_URI: mongoUri,
    JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
  });

  const { default: app } = await import('../dist/app.js');
  await mongoose.connect(mongoUri, { dbName, serverSelectionTimeoutMS: 10000 });
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise((resolve) => server.close(resolve));
      assert.equal(mongoose.connection.name, dbName);
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });
  await once(server, 'listening');
  const api = `http://127.0.0.1:${server.address().port}/api`;

  const registration = await fetch(`${api}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'CSV Tester',
      email: 'csv@example.test',
      password: `Test!${randomUUID()}9`,
    }),
  });
  assert.equal(registration.status, 201);
  const accessCookie = registration.headers.getSetCookie()
    .find((cookie) => cookie.startsWith('accessToken='));
  assert.ok(accessCookie, 'Registration should set the access cookie');
  const headers = { Cookie: accessCookie.split(';')[0] };

  const csv = [
    'Date,Amount,Category,Description',
    '2026-11-20,1250.00,Food,"CSV test, weekly shop"',
    '2026-11-20,1250.00,Food,"CSV test, weekly shop"',
    '2026-11-21,80.00,Food,CSV test snacks',
  ].join('\n');

  async function upload(route, fields = {}) {
    const body = new FormData();
    body.set('file', new Blob([csv], { type: 'text/csv' }), 'duplicates.csv');
    for (const [key, value] of Object.entries(fields)) {
      body.set(key, value);
    }
    const response = await fetch(`${api}/csv/${route}`, { method: 'POST', headers, body });
    assert.equal(response.status, 200, `CSV ${route} failed`);
    return response.json();
  }

  const { preview } = await upload('preview');
  assert.equal(preview.totalRows, 3);

  const fields = {
    dateColumn: 'Date',
    amountColumn: 'Amount',
    categoryColumn: 'Category',
    descriptionColumn: 'Description',
    type: 'expense',
    skipDuplicates: 'true',
  };
  for (const [imported, skipped] of [[2, 1], [0, 3]]) {
    const { result } = await upload('import', fields);
    assert.equal(result.failed, 0, JSON.stringify(result.errors));
    assert.equal(result.imported, imported);
    assert.equal(result.skipped, skipped);
  }

  const list = await fetch(`${api}/transactions`, { headers });
  assert.equal(list.status, 200);
  assert.equal((await list.json()).pagination.total, 2);
});
