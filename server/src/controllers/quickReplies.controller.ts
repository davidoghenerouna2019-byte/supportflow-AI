import type { Response } from 'express';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import { departments, quickReplies } from '../../../src/db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { ensureSeeded } from '../services/seed.service.ts';
import { recordAuditLog, sanitizeText } from '../utils/sanitize.ts';
import {
  quickReplySchema,
  updateQuickReplySchema,
} from '../validators/schemas.ts';

function normalizeShortcut(raw?: string): string {
  const cleaned = sanitizeText(raw ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (!cleaned) return '';
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

export async function listQuickReplies(req: AuthRequest, res: Response) {
  await ensureSeeded();

  const category =
    typeof req.query.category === 'string' && req.query.category !== 'ALL'
      ? req.query.category.trim()
      : undefined;
  const search =
    typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const includeInactive =
    req.query.includeInactive === 'true' && req.user?.role === 'ADMIN';

  const conditions = [];
  if (!includeInactive) {
    conditions.push(eq(quickReplies.isActive, true));
  }
  if (category) {
    conditions.push(eq(quickReplies.category, category));
  }
  if (search) {
    conditions.push(
      or(
        ilike(quickReplies.title, `%${search}%`),
        ilike(quickReplies.shortcut, `%${search}%`),
        ilike(quickReplies.content, `%${search}%`)
      )!
    );
  }

  const rows = await db
    .select({
      id: quickReplies.id,
      title: quickReplies.title,
      shortcut: quickReplies.shortcut,
      category: quickReplies.category,
      content: quickReplies.content,
      departmentId: quickReplies.departmentId,
      departmentName: departments.name,
      createdById: quickReplies.createdById,
      isActive: quickReplies.isActive,
      usageCount: quickReplies.usageCount,
      createdAt: quickReplies.createdAt,
      updatedAt: quickReplies.updatedAt,
    })
    .from(quickReplies)
    .leftJoin(departments, eq(quickReplies.departmentId, departments.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(quickReplies.usageCount), asc(quickReplies.title));

  return res.json({ quickReplies: rows });
}

export async function createQuickReply(req: AuthRequest, res: Response) {
  await ensureSeeded();
  const parsed = quickReplySchema.parse(req.body);

  if (parsed.departmentId) {
    const [dept] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.id, parsed.departmentId))
      .limit(1);
    if (!dept) {
      throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
    }
  }

  const [created] = await db
    .insert(quickReplies)
    .values({
      title: sanitizeText(parsed.title),
      shortcut: normalizeShortcut(parsed.shortcut),
      category: sanitizeText(parsed.category),
      content: sanitizeText(parsed.content),
      departmentId: parsed.departmentId ?? null,
      createdById: req.user?.id ?? null,
      isActive: parsed.isActive,
    })
    .returning();

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'QUICK_REPLY_CREATED',
    entityType: 'QUICK_REPLY',
    entityId: created.id,
    details: `${created.title} (${created.category})`,
  });

  return res.status(201).json({ quickReply: created });
}

export async function updateQuickReply(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid quick reply ID', 400, 'INVALID_ID');
  }

  const [existing] = await db
    .select()
    .from(quickReplies)
    .where(eq(quickReplies.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError('Quick reply template not found', 404, 'NOT_FOUND');
  }

  if (req.user?.role !== 'ADMIN' && existing.createdById !== req.user?.id) {
    throw new AppError(
      'You can only edit quick reply templates you created.',
      403,
      'FORBIDDEN'
    );
  }

  const parsed = updateQuickReplySchema.parse(req.body);

  const [updated] = await db
    .update(quickReplies)
    .set({
      ...(parsed.title !== undefined ? { title: sanitizeText(parsed.title) } : {}),
      ...(parsed.shortcut !== undefined
        ? { shortcut: normalizeShortcut(parsed.shortcut) }
        : {}),
      ...(parsed.category !== undefined
        ? { category: sanitizeText(parsed.category) }
        : {}),
      ...(parsed.content !== undefined
        ? { content: sanitizeText(parsed.content) }
        : {}),
      ...(parsed.departmentId !== undefined
        ? { departmentId: parsed.departmentId }
        : {}),
      ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(quickReplies.id, id))
    .returning();

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'QUICK_REPLY_UPDATED',
    entityType: 'QUICK_REPLY',
    entityId: id,
    details: updated.title,
  });

  return res.json({ quickReply: updated });
}

export async function deleteQuickReply(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid quick reply ID', 400, 'INVALID_ID');
  }

  const [existing] = await db
    .select()
    .from(quickReplies)
    .where(eq(quickReplies.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError('Quick reply template not found', 404, 'NOT_FOUND');
  }

  if (req.user?.role !== 'ADMIN' && existing.createdById !== req.user?.id) {
    throw new AppError(
      'You can only delete quick reply templates you created.',
      403,
      'FORBIDDEN'
    );
  }

  await db.delete(quickReplies).where(eq(quickReplies.id, id));

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'QUICK_REPLY_DELETED',
    entityType: 'QUICK_REPLY',
    entityId: id,
    details: existing.title,
  });

  return res.json({ deletedId: id });
}

export async function recordQuickReplyUsage(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid quick reply ID', 400, 'INVALID_ID');
  }

  const [updated] = await db
    .update(quickReplies)
    .set({
      usageCount: sql`${quickReplies.usageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(quickReplies.id, id))
    .returning();

  if (!updated) {
    throw new AppError('Quick reply template not found', 404, 'NOT_FOUND');
  }

  return res.json({ quickReply: updated });
}
