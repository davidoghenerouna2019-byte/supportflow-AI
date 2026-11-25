import type { Response } from 'express';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import { knowledgeArticles } from '../../../src/db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { ensureSeeded } from '../services/seed.service.ts';
import { recordAuditLog, sanitizeText } from '../utils/sanitize.ts';
import { knowledgeArticleSchema } from '../validators/schemas.ts';

export async function listKnowledge(req: AuthRequest, res: Response) {
  await ensureSeeded();
  const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'AGENT';
  const search =
    typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const category =
    typeof req.query.category === 'string' && req.query.category !== 'ALL'
      ? req.query.category.trim()
      : '';

  const conditions = [];
  if (!isStaff) {
    conditions.push(eq(knowledgeArticles.isPublished, true));
  } else if (req.query.published === 'true') {
    conditions.push(eq(knowledgeArticles.isPublished, true));
  } else if (req.query.published === 'false') {
    conditions.push(eq(knowledgeArticles.isPublished, false));
  }

  if (category) {
    conditions.push(eq(knowledgeArticles.category, category));
  }

  if (search) {
    conditions.push(
      or(
        ilike(knowledgeArticles.title, `%${search}%`),
        ilike(knowledgeArticles.question, `%${search}%`),
        ilike(knowledgeArticles.answer, `%${search}%`),
        ilike(knowledgeArticles.keywords, `%${search}%`)
      )!
    );
  }

  const articles = await db
    .select()
    .from(knowledgeArticles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(knowledgeArticles.updatedAt));

  return res.json({ articles });
}

export async function createKnowledge(req: AuthRequest, res: Response) {
  const parsed = knowledgeArticleSchema.parse(req.body);

  const [created] = await db
    .insert(knowledgeArticles)
    .values({
      title: sanitizeText(parsed.title),
      question: sanitizeText(parsed.question),
      answer: sanitizeText(parsed.answer),
      category: sanitizeText(parsed.category),
      keywords: sanitizeText(parsed.keywords),
      isPublished: parsed.isPublished,
    })
    .returning();

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'KB_ARTICLE_CREATED',
    entityType: 'KNOWLEDGE_ARTICLE',
    entityId: created.id,
    details: created.title,
  });

  return res.status(201).json({ article: created });
}

export async function updateKnowledge(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid article ID', 400, 'INVALID_ID');
  }

  const parsed = knowledgeArticleSchema.partial().parse(req.body);

  const [updated] = await db
    .update(knowledgeArticles)
    .set({
      ...(parsed.title !== undefined ? { title: sanitizeText(parsed.title) } : {}),
      ...(parsed.question !== undefined ? { question: sanitizeText(parsed.question) } : {}),
      ...(parsed.answer !== undefined ? { answer: sanitizeText(parsed.answer) } : {}),
      ...(parsed.category !== undefined ? { category: sanitizeText(parsed.category) } : {}),
      ...(parsed.keywords !== undefined ? { keywords: sanitizeText(parsed.keywords) } : {}),
      ...(parsed.isPublished !== undefined ? { isPublished: parsed.isPublished } : {}),
      updatedAt: new Date(),
    })
    .where(eq(knowledgeArticles.id, id))
    .returning();

  if (!updated) {
    throw new AppError('Knowledge article not found', 404, 'NOT_FOUND');
  }

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'KB_ARTICLE_UPDATED',
    entityType: 'KNOWLEDGE_ARTICLE',
    entityId: id,
    details: `${updated.title} (published=${updated.isPublished})`,
  });

  return res.json({ article: updated });
}

export async function deleteKnowledge(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid article ID', 400, 'INVALID_ID');
  }

  const [deleted] = await db
    .delete(knowledgeArticles)
    .where(eq(knowledgeArticles.id, id))
    .returning();

  if (!deleted) {
    throw new AppError('Knowledge article not found', 404, 'NOT_FOUND');
  }

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'KB_ARTICLE_DELETED',
    entityType: 'KNOWLEDGE_ARTICLE',
    entityId: id,
    details: deleted.title,
  });

  return res.json({ deletedId: id });
}
