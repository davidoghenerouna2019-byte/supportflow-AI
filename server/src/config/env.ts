import crypto from 'node:crypto';

let cachedRuntimeJwtSecret: string | null = null;

export function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (!cachedRuntimeJwtSecret) {
    cachedRuntimeJwtSecret = crypto.randomBytes(32).toString('hex');
  }
  return cachedRuntimeJwtSecret;
}

export const OWNER_ADMIN_EMAILS = new Set([
  'davidoghenerouna2019@gmail.com',
  'admin@supportflow.ai',
]);
