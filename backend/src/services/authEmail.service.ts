import { createHmac, randomInt } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { authCodeRepository } from '../repositories/authCode.repository.js';
import { AppError } from '../utils/AppError.js';

type EmailCodePurpose = 'signup' | 'verify-email' | 'reset-password';

const subjects: Record<EmailCodePurpose, string> = {
  signup: 'Your SpendWise signup code',
  'verify-email': 'Verify your SpendWise email',
  'reset-password': 'Reset your SpendWise password',
};

export const emailEnabled = Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL);

function digest(...parts: string[]): string {
  return createHmac('sha256', env.JWT_REFRESH_SECRET)
    .update(JSON.stringify(['spendwise-email-otp', ...parts]))
    .digest('hex');
}

export function requireEmailDelivery(): void {
  if (!emailEnabled) throw new AppError('Email delivery is unavailable right now.', 503);
}

async function sendEmail(email: string, subject: string, textContent: string): Promise<void> {
  requireEmailDelivery();
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: env.BREVO_SENDER_EMAIL, name: 'SpendWise' },
      to: [{ email }],
      subject,
      textContent,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (response?.body) await response.body.cancel().catch(() => {});
  if (!response?.ok) {
    logger.warn({ status: response?.status }, 'SpendWise email delivery failed');
    throw new AppError('Could not send the email. Please try again shortly.', 502);
  }
}

export async function sendEmailCode(
  purpose: EmailCodePurpose,
  email: string,
  accountId = '',
): Promise<void> {
  const code = randomInt(1_000_000).toString().padStart(6, '0');
  const key = digest(purpose, email, accountId);
  const proof = digest(purpose, email, accountId, code);
  const now = Date.now();
  const reserved = await authCodeRepository.reserve(
    key, proof, new Date(now), new Date(now + 10 * 60_000), new Date(now + 60_000),
  );
  if (!reserved) return;

  try {
    await sendEmail(
      email,
      subjects[purpose],
      `Your SpendWise code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    );
  } catch (error) {
    await authCodeRepository.discard(key, proof);
    throw error;
  }
}

export async function verifyEmailCode(
  purpose: EmailCodePurpose,
  email: string,
  code: string,
  accountId = '',
): Promise<void> {
  const used = await authCodeRepository.consume(
    digest(purpose, email, accountId), digest(purpose, email, accountId, code),
  );
  if (!used) throw new AppError('This code is invalid or expired. Request a new code and try again.', 401);
}

export async function sendPasswordResetNotice(email: string): Promise<void> {
  await sendEmail(
    email,
    'Your SpendWise password changed',
    'Your SpendWise password was reset. If you did not make this change, reset your password again and secure your email account.',
  );
}
