import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import {
  auditLogs,
  contactInquiries,
  conversations,
  departments,
  routingRules,
  users,
} from '../../../src/db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { ensureSeeded } from '../services/seed.service.ts';
import {
  normalizeEmail,
  recordAuditLog,
  sanitizeText,
} from '../utils/sanitize.ts';
import {
  contactSchema,
  createAgentSchema,
  departmentSchema,
  routingRuleSchema,
  updateAgentSchema,
} from '../validators/schemas.ts';

// --- Departments ---
export async function listDepartments(_req: Request, res: Response) {
  await ensureSeeded();
  const deptRows = await db
    .select()
    .from(departments)
    .orderBy(asc(departments.id));

  const convRows = await db.select().from(conversations);
  const agentRows = await db
    .select({ id: users.id, departmentId: users.departmentId, role: users.role })
    .from(users)
    .where(inArray(users.role, ['AGENT', 'ADMIN']));

  const enriched = deptRows.map((d) => ({
    ...d,
    agentCount: agentRows.filter((a) => a.departmentId === d.id).length,
    conversationCount: convRows.filter((c) => c.departmentId === d.id).length,
    openCount: convRows.filter(
      (c) =>
        c.departmentId === d.id &&
        c.status !== 'RESOLVED' &&
        c.status !== 'CLOSED'
    ).length,
  }));

  return res.json({ departments: enriched });
}

export async function createDepartment(req: AuthRequest, res: Response) {
  const parsed = departmentSchema.parse(req.body);
  const [created] = await db
    .insert(departments)
    .values({
      name: sanitizeText(parsed.name),
      description: sanitizeText(parsed.description),
      isActive: parsed.isActive,
    })
    .returning();

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'DEPARTMENT_CREATED',
    entityType: 'DEPARTMENT',
    entityId: created.id,
    details: created.name,
  });

  return res.status(201).json({ department: created });
}

export async function updateDepartment(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid department ID', 400, 'INVALID_ID');
  }
  const parsed = departmentSchema.partial().parse(req.body);

  const [updated] = await db
    .update(departments)
    .set({
      ...(parsed.name !== undefined ? { name: sanitizeText(parsed.name) } : {}),
      ...(parsed.description !== undefined
        ? { description: sanitizeText(parsed.description) }
        : {}),
      ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
    })
    .where(eq(departments.id, id))
    .returning();

  if (!updated) {
    throw new AppError('Department not found', 404, 'NOT_FOUND');
  }

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'DEPARTMENT_UPDATED',
    entityType: 'DEPARTMENT',
    entityId: id,
    details: `${updated.name} (active=${updated.isActive})`,
  });

  return res.json({ department: updated });
}

export async function deleteDepartment(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid department ID', 400, 'INVALID_ID');
  }

  const [deactivated] = await db
    .update(departments)
    .set({ isActive: false })
    .where(eq(departments.id, id))
    .returning();

  if (!deactivated) {
    throw new AppError('Department not found', 404, 'NOT_FOUND');
  }

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'DEPARTMENT_DEACTIVATED',
    entityType: 'DEPARTMENT',
    entityId: id,
    details: deactivated.name,
  });

  return res.json({ department: deactivated });
}

// --- Support Agents ---
export async function listAgents(_req: AuthRequest, res: Response) {
  await ensureSeeded();
  const agentRows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      departmentId: users.departmentId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(inArray(users.role, ['AGENT', 'ADMIN']))
    .orderBy(asc(users.id));

  const deptRows = await db.select().from(departments);
  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));
  const convRows = await db.select().from(conversations);

  const enriched = agentRows.map((a) => {
    const assigned = convRows.filter((c) => c.assignedAgentId === a.id);
    const activeWorkload = assigned.filter(
      (c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED'
    ).length;
    const resolvedCount = assigned.filter(
      (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
    ).length;
    return {
      ...a,
      departmentName: a.departmentId ? deptMap.get(a.departmentId) ?? 'Unassigned' : 'Unassigned',
      activeWorkload,
      resolvedCount,
      totalAssigned: assigned.length,
    };
  });

  return res.json({ agents: enriched });
}

export async function createAgent(req: AuthRequest, res: Response) {
  const parsed = createAgentSchema.parse(req.body);
  const email = normalizeEmail(parsed.email);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError('A user with this email already exists.', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      fullName: sanitizeText(parsed.fullName),
      email,
      passwordHash,
      role: parsed.role,
      departmentId: parsed.departmentId ?? null,
      isActive: parsed.isActive,
    })
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'AGENT_CREATED',
    entityType: 'USER',
    entityId: created.id,
    details: `${created.email} (${created.role})`,
  });

  return res.status(201).json({ agent: created });
}

export async function updateAgent(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid agent ID', 400, 'INVALID_ID');
  }
  const parsed = updateAgentSchema.parse(req.body);

  const passwordHash = parsed.password
    ? await bcrypt.hash(parsed.password, 10)
    : undefined;

  const [updated] = await db
    .update(users)
    .set({
      ...(parsed.fullName !== undefined
        ? { fullName: sanitizeText(parsed.fullName) }
        : {}),
      ...(parsed.email !== undefined
        ? { email: normalizeEmail(parsed.email) }
        : {}),
      ...(parsed.departmentId !== undefined
        ? { departmentId: parsed.departmentId }
        : {}),
      ...(parsed.role !== undefined ? { role: parsed.role } : {}),
      ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
      ...(passwordHash ? { passwordHash } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

  if (!updated) {
    throw new AppError('Agent not found', 404, 'NOT_FOUND');
  }

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'AGENT_UPDATED',
    entityType: 'USER',
    entityId: id,
    details: `${updated.email} active=${updated.isActive}`,
  });

  return res.json({ agent: updated });
}

export async function deleteAgent(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid agent ID', 400, 'INVALID_ID');
  }

  if (req.user?.id === id) {
    throw new AppError('You cannot deactivate your own active account.', 400, 'SELF_DEACTIVATE');
  }

  const [deactivated] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      isActive: users.isActive,
    });

  if (!deactivated) {
    throw new AppError('Agent not found', 404, 'NOT_FOUND');
  }

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'AGENT_DEACTIVATED',
    entityType: 'USER',
    entityId: id,
    details: deactivated.email,
  });

  return res.json({ agent: deactivated });
}

// --- Customers ---
export async function listCustomers(_req: AuthRequest, res: Response) {
  await ensureSeeded();
  const custRows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'CUSTOMER'))
    .orderBy(desc(users.createdAt));

  const convRows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));

  const enriched = custRows.map((c) => {
    const history = convRows.filter((cv) => cv.customerId === c.id);
    return {
      ...c,
      conversationCount: history.length,
      conversations: history.map((h) => ({
        id: h.id,
        subject: h.subject,
        category: h.category,
        status: h.status,
        createdAt: h.createdAt,
      })),
    };
  });

  return res.json({ customers: enriched });
}

// --- Routing Rules ---
export async function listRoutingRules(_req: AuthRequest, res: Response) {
  await ensureSeeded();
  const rules = await db
    .select({
      id: routingRules.id,
      category: routingRules.category,
      keywords: routingRules.keywords,
      departmentId: routingRules.departmentId,
      departmentName: departments.name,
      priority: routingRules.priority,
      isActive: routingRules.isActive,
      createdAt: routingRules.createdAt,
      updatedAt: routingRules.updatedAt,
    })
    .from(routingRules)
    .innerJoin(departments, eq(routingRules.departmentId, departments.id))
    .orderBy(asc(routingRules.priority));

  return res.json({ rules });
}

export async function createRoutingRule(req: AuthRequest, res: Response) {
  const parsed = routingRuleSchema.parse(req.body);
  const [created] = await db
    .insert(routingRules)
    .values({
      category: sanitizeText(parsed.category),
      keywords: sanitizeText(parsed.keywords),
      departmentId: parsed.departmentId,
      priority: parsed.priority,
      isActive: parsed.isActive,
    })
    .returning();

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'ROUTING_RULE_CREATED',
    entityType: 'ROUTING_RULE',
    entityId: created.id,
    details: `${created.category} -> dept ${created.departmentId}`,
  });

  return res.status(201).json({ rule: created });
}

export async function updateRoutingRule(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid rule ID', 400, 'INVALID_ID');
  }
  const parsed = routingRuleSchema.partial().parse(req.body);

  const [updated] = await db
    .update(routingRules)
    .set({
      ...(parsed.category !== undefined ? { category: sanitizeText(parsed.category) } : {}),
      ...(parsed.keywords !== undefined ? { keywords: sanitizeText(parsed.keywords) } : {}),
      ...(parsed.departmentId !== undefined ? { departmentId: parsed.departmentId } : {}),
      ...(parsed.priority !== undefined ? { priority: parsed.priority } : {}),
      ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(routingRules.id, id))
    .returning();

  if (!updated) {
    throw new AppError('Routing rule not found', 404, 'NOT_FOUND');
  }

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'ROUTING_RULE_UPDATED',
    entityType: 'ROUTING_RULE',
    entityId: id,
    details: `${updated.category} active=${updated.isActive}`,
  });

  return res.json({ rule: updated });
}

export async function deleteRoutingRule(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid rule ID', 400, 'INVALID_ID');
  }

  const [deleted] = await db
    .delete(routingRules)
    .where(eq(routingRules.id, id))
    .returning();

  if (!deleted) {
    throw new AppError('Routing rule not found', 404, 'NOT_FOUND');
  }

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'ROUTING_RULE_DELETED',
    entityType: 'ROUTING_RULE',
    entityId: id,
  });

  return res.json({ deletedId: id });
}

// --- Audit Logs & Public Contact Inquiries ---
export async function listAuditLogs(_req: AuthRequest, res: Response) {
  await ensureSeeded();
  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      actorName: users.fullName,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return res.json({ logs });
}

export async function submitContactInquiry(req: Request, res: Response) {
  const parsed = contactSchema.parse(req.body);
  const [saved] = await db
    .insert(contactInquiries)
    .values({
      name: sanitizeText(parsed.name),
      email: normalizeEmail(parsed.email),
      company: sanitizeText(parsed.company),
      message: sanitizeText(parsed.message),
    })
    .returning();

  return res.status(201).json({
    inquiry: saved,
    message: 'Thank you for contacting Support Flow AI. Your message has been received.',
  });
}
