import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const googleClient = new OAuth2Client();
const invalidCredentialMessage = 'Google sign-in could not be verified. Please try again.';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

const googleClaimsSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().trim().optional(),
  picture: z.string().regex(/^https:\/\/lh\d+\.googleusercontent\.com\//).optional().catch(undefined),
});

export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError('Google sign-in is not configured', 503);
  }

  let payload: unknown;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    // The verifier's error message may contain the original credential.
    throw new AppError(invalidCredentialMessage, 401);
  }

  const claims = googleClaimsSchema.safeParse(payload);
  if (!claims.success) {
    throw new AppError(invalidCredentialMessage, 401);
  }

  const { sub, email, name, picture, email_verified } = claims.data;
  return {
    googleId: sub,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    avatarUrl: picture,
    emailVerified: email_verified === true,
  };
}
