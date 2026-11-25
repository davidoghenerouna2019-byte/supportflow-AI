import { db } from '../../../src/db/index.ts';
import { auditLogs } from '../../../src/db/schema.ts';

/**
 * Strips ASCII control characters (except newlines/tabs) and trims whitespace
 * to prevent control-character injection while preserving natural prose.
 */
export function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function recordAuditLog(params: {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  details?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      details: params.details ?? null,
    });
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}
