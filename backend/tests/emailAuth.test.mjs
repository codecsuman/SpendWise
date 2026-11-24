import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import mongoose from 'mongoose';

test('email codes verify signup and existing accounts and reset passwords once', async (t) => {
  const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = 'spendwise_email_test_' + randomUUID().replaceAll('-', '');
  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '0',
    CLIENT_URL: 'http://localhost:5173',
    MONGODB_URI: mongoUri,
    JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    BREVO_API_KEY: 'test-key',
    BREVO_SENDER_EMAIL: 'sender@example.test',
  });

  const realFetch = globalThis.fetch;
  const messages = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url !== 'https://api.brevo.com/v3/smtp/email') return realFetch(url, options);
    assert.equal(options.headers['api-key'], 'test-key');
    messages.push(JSON.parse(options.body));
    return Response.json({ messageId: 'test' }, { status: 201 });
  });

  async function waitForEmail(subject, to) {
    for (let i = 0; i < 100; i++) {
      const message = messages.find((mail) => mail.subject === subject && mail.to[0].email === to);
      if (message) return message;
      await delay(20);
    }
    throw new Error('Expected an email for ' + subject);
  }

  async function codeFrom(subject, to) {
    const email = await waitForEmail(subject, to);
    const code = email.textContent.match(/\b\d{6}\b/)?.[0];
    assert.ok(code, 'Expected a six-digit code');
    return code;
  }

  const { default: app } = await import('../dist/app.js');
  const { User } = await import('../dist/models/User.model.js');
  const { AuthCode } = await import('../dist/models/AuthCode.model.js');
  const { hashPassword } = await import('../dist/utils/password.js');
  await mongoose.connect(mongoUri, { dbName, serverSelectionTimeoutMS: 10_000 });
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
  const api = 'http://127.0.0.1:' + server.address().port + '/api/auth/';
  const post = (path, body, cookie) => fetch(api + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  const cookieFrom = (response, name) => {
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith(name + '='));
    assert.ok(cookie, 'Expected ' + name + ' cookie');
    return cookie.split(';')[0];
  };

  assert.deepEqual(await (await fetch(api + 'options')).json(), { emailCodes: true });

  const email = 'signup@example.test';
  const password = 'Pass!word123';
  const signup = { email, name: 'Test User', password };
  assert.equal((await post('register', signup)).status, 400);
  const requested = await post('register/code', { email });
  assert.equal(requested.status, 202);
  assert.equal(Object.hasOwn(await requested.json(), 'code'), false);
  const signupCode = await codeFrom('Your SpendWise signup code', email);
  const stored = await AuthCode.findOne().lean();
  assert.match(stored.digest, /^[a-f0-9]{64}$/);
  assert.notEqual(stored.digest, signupCode);
  assert.ok(stored.expiresAt > new Date());
  assert.equal((await post('register/code', { email })).status, 202);

  const registered = await post('register', { ...signup, code: signupCode });
  assert.equal(registered.status, 201);
  assert.equal((await registered.json()).user.emailVerified, true);
  const accessCookie = cookieFrom(registered, 'accessToken');
  const refreshCookie = cookieFrom(registered, 'refreshToken');
  assert.equal((await post('register', { ...signup, code: signupCode })).status, 401);
  assert.equal(messages.filter((message) => message.subject === 'Your SpendWise signup code').length, 1);

  const legacyEmail = 'existing@example.test';
  const legacy = await User.create({ name: 'Existing User', email: legacyEmail, password: await hashPassword(password) });
  // Existing documents created before session versioning do not have the field.
  await User.collection.updateOne({ _id: legacy._id }, { $unset: { sessionVersion: 1 } });
  const legacyLogin = await post('login', { email: legacyEmail, password });
  assert.equal(legacyLogin.status, 200);
  const legacyCookie = cookieFrom(legacyLogin, 'accessToken');
  assert.equal((await post('email/code', {})).status, 401);
  assert.equal((await post('email/code', {}, legacyCookie)).status, 202);
  const verificationCode = await codeFrom('Verify your SpendWise email', legacyEmail);
  const verified = await post('email/verify', { code: verificationCode }, legacyCookie);
  assert.equal(verified.status, 200);
  assert.equal((await verified.json()).user.emailVerified, true);

  const unknownEmail = 'missing@example.test';
  const [unknownRequest, resetRequested] = await Promise.all([
    post('forgot-password', { email: unknownEmail }),
    post('forgot-password', { email }),
  ]);
  assert.equal(unknownRequest.status, 202);
  assert.equal(resetRequested.status, 202);
  assert.deepEqual(await unknownRequest.json(), await resetRequested.json());
  const resetCode = await codeFrom('Reset your SpendWise password', email);
  const newPassword = 'Fresh!pass456';
  const wrongCode = resetCode === '000000' ? '111111' : '000000';
  assert.equal((await post('reset-password', { email, password: newPassword, code: wrongCode })).status, 401);
  assert.ok(await AuthCode.exists({ attemptsLeft: 4 }));

  const resets = await Promise.all([
    post('reset-password', { email, password: newPassword, code: resetCode }),
    post('reset-password', { email, password: newPassword, code: resetCode }),
  ]);
  assert.deepEqual(resets.map((response) => response.status).sort(), [200, 401]);
  await waitForEmail('Your SpendWise password changed', email);
  assert.equal(messages.some((message) => message.to[0].email === unknownEmail), false);
  assert.equal((await fetch(api + 'me', { headers: { Cookie: accessCookie } })).status, 401);
  assert.equal((await post('refresh', {}, refreshCookie)).status, 401);
  assert.equal((await post('login', { email, password })).status, 401);
  assert.equal((await post('login', { email, password: newPassword })).status, 200);
});
