import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';

test('Google credentials create, sign in to, and explicitly link SpendWise accounts', async (t) => {
  const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = 'spendwise_google_test_' + randomUUID().replaceAll('-', '');
  const clientId = 'spendwise-test.apps.googleusercontent.com';
  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '0',
    CLIENT_URL: 'http://localhost:5173',
    MONGODB_URI: mongoUri,
    JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    GOOGLE_CLIENT_ID: clientId,
  });

  // Replace Google's cert download while exercising the real token verifier.
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  t.mock.method(OAuth2Client.prototype, 'getFederatedSignonCertsAsync', async () => ({
    certs: { test: publicKey.export({ format: 'pem', type: 'spki' }) },
    format: 'PEM',
  }));
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url');
  function credential(claims) {
    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: 'RS256', kid: 'test' });
    const payload = encode({
      iss: 'https://accounts.google.com',
      aud: clientId,
      iat: now,
      exp: now + 60,
      email_verified: true,
      name: 'Test User',
      ...claims,
    });
    const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), privateKey);
    return `${header}.${payload}.${signature.toString('base64url')}`;
  }

  const { default: app } = await import('../dist/app.js');
  const { User } = await import('../dist/models/User.model.js');
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
  await User.init();
  const api = `http://127.0.0.1:${server.address().port}/api/auth`;
  const post = (path, body, cookie) => fetch(`${api}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });

  const googleClaims = { sub: 'new-google-user', email: 'new@example.test' };
  const token = credential(googleClaims);
  const signups = await Promise.all([post('google', { credential: token }), post('google', { credential: token })]);
  let firstUserId;
  for (const response of signups) {
    assert.equal(response.status, 200);
    const { user } = await response.json();
    assert.equal(user.googleLinked, true);
    assert.equal(user.emailVerified, true);
    assert.equal(Object.hasOwn(user, 'googleId'), false);
    firstUserId ??= user.id;
    assert.equal(user.id, firstUserId);
  }
  assert.equal(await User.countDocuments({ googleId: googleClaims.sub }), 1);

  const returning = await post('google', {
    credential: credential({ ...googleClaims, email: 'new-address@example.test' }),
  });
  assert.equal(returning.status, 200);
  assert.equal((await returning.json()).user.id, firstUserId);
  const cookies = returning.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.ok(cookies.every((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Strict')));
  const session = await fetch(`${api}/me`, {
    headers: { Cookie: cookies.map((cookie) => cookie.split(';')[0]).join('; ') },
  });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).user.id, firstUserId);

  const passwordEmail = 'password@example.test';
  const registered = await post('register', {
    email: passwordEmail,
    name: 'Password User',
    password: `Test!${randomUUID()}9`,
  });
  assert.equal(registered.status, 201);
  const passwordUser = (await registered.json()).user;
  const passwordCookie = registered.headers.getSetCookie()
    .find((cookie) => cookie.startsWith('accessToken=')).split(';')[0];
  const passwordToken = credential({ sub: 'link-google-user', email: passwordEmail });

  const conflict = await post('google', { credential: passwordToken });
  assert.equal(conflict.status, 409);
  assert.match((await conflict.json()).message, /link Google from Profile/);
  assert.equal(await User.countDocuments({ googleId: 'link-google-user' }), 0);

  assert.equal((await post('google/link', { credential: passwordToken })).status, 401);
  assert.equal((await post('google/link', { credential: token }, passwordCookie)).status, 403);
  const linked = await post('google/link', { credential: passwordToken }, passwordCookie);
  assert.equal(linked.status, 200);
  assert.equal((await linked.json()).user.googleLinked, true);
  const linkedLogin = await post('google', { credential: passwordToken });
  assert.equal(linkedLogin.status, 200);
  assert.equal((await linkedLogin.json()).user.id, passwordUser.id);
  assert.equal(await User.countDocuments(), 2);

  const wrongAudience = credential({ ...googleClaims, aud: 'different-client' });
  assert.equal((await post('google', { credential: wrongAudience })).status, 401);
  const unverified = credential({ sub: 'unverified', email: 'unverified@example.test', email_verified: false });
  assert.equal((await post('google', { credential: unverified })).status, 401);
  assert.equal((await post('google', { credential: token, email: 'unexpected' })).status, 400);
  assert.equal(await User.countDocuments(), 2);
});
