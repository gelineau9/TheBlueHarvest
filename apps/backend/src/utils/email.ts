/**
 * email.ts
 *
 * Thin wrapper around the Resend email provider.
 *
 * In non-production environments (development, test) emails are never sent to
 * Resend. Instead their full content is written to the Winston logger at the
 * `info` level so developers can inspect the links without a real API key.
 *
 * Environment variables consumed at call-time (not at module load):
 *   RESEND_API_KEY     — Resend secret key (required in production)
 *   RESEND_FROM_EMAIL  — Sender address, e.g. noreply@yourdomain.com
 *   BACKEND_URL        — Used to build verification / reset links
 *   FRONTEND_URL       — Base URL of the Next.js app (e.g. https://brandyhallarchives.com)
 */

import { Resend } from 'resend';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
}

function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL environment variable is not set');
  }
  return from;
}

function isDevMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (isDevMode()) {
    logger.info(
      `[email] DEV MODE — email not sent via Resend.\n` +
        `  To:      ${payload.to}\n` +
        `  Subject: ${payload.subject}\n` +
        `  Body:\n${payload.text}`,
    );
    return;
  }

  const resend = buildResendClient();
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });

  if (error) {
    logger.error('[email] Resend API returned an error', { error, to: payload.to, subject: payload.subject });
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(to: string, username: string, token: string): Promise<void> {
  const baseUrl =
    process.env.FRONTEND_URL ??
    process.env.ALLOWED_ORIGINS?.split(',')[0].trim() ??
    process.env.BACKEND_URL;
  const link = `${baseUrl}/verify-email?token=${token}`;

  const text = [
    `Hi ${username},`,
    ``,
    `Thanks for signing up for The Brandy Hall Archives.`,
    `Please verify your email address by clicking the link below:`,
    ``,
    `  ${link}`,
    ``,
    `This link expires in 24 hours.`,
    ``,
    `If you did not create an account, you can safely ignore this email.`,
  ].join('\n');

  try {
    await sendEmail({ to, subject: 'Verify your Blue Harvest email address', text });
  } catch (err) {
    logger.error('[email] sendVerificationEmail failed', { err, to });
    throw err;
  }
}

export async function sendPasswordResetEmail(to: string, username: string, token: string): Promise<void> {
  const baseUrl =
    process.env.FRONTEND_URL ??
    process.env.ALLOWED_ORIGINS?.split(',')[0].trim() ??
    process.env.BACKEND_URL;
  const link = `${baseUrl}/reset-password?token=${token}`;

  const text = [
    `Hi ${username},`,
    ``,
    `We received a request to reset the password for your Blue Harvest account.`,
    `Click the link below to choose a new password:`,
    ``,
    `  ${link}`,
    ``,
    `This link expires in 1 hour.`,
    ``,
    `If you did not request a password reset, you can safely ignore this email.`,
    `Your password will not be changed.`,
  ].join('\n');

  try {
    await sendEmail({ to, subject: 'Reset your Blue Harvest password', text });
  } catch (err) {
    logger.error('[email] sendPasswordResetEmail failed', { err, to });
    throw err;
  }
}

export async function sendPasswordChangedEmail(to: string, username: string): Promise<void> {
  const text = [
    `Hi ${username},`,
    ``,
    `This is a confirmation that the password for your Blue Harvest account has been changed.`,
    ``,
    `If you did not make this change, please contact support immediately.`,
  ].join('\n');

  try {
    await sendEmail({ to, subject: 'Your Blue Harvest password has been changed', text });
  } catch (err) {
    logger.error('[email] sendPasswordChangedEmail failed', { err, to });
    throw err;
  }
}
