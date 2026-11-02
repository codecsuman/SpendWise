// ============================================================================
// One-way hash for refresh tokens.
//
// We never store the refresh token itself. We store SHA-256(token).
// On refresh we hash the incoming cookie and look for that value in MongoDB.
//
// Why SHA-256 and not bcrypt?
//   bcrypt adds a random salt, so the same input gives a different output every
//   time — that makes a database lookup impossible. We need a deterministic
//   hash to find the session row. The token is already a signed random string,
//   so a fast hash is safe here (there is nothing to guess).
// ============================================================================

import { createHash } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
