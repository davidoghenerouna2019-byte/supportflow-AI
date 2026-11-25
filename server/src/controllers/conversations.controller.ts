import type { Response } from 'express';
import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import {
  assignments,
  conversationNotes,
  conversations,
  departments,
  messages,
  users,
} from '../../../src/db/schema.ts';
import {
  type AuthRequest,
  signGuestConversationToken,
} from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import {
  generateGroundedSupportReply,
  NO_KB_ANSWER_FALLBACK,
} from '../services/gemini.service.ts';
import { resolveDepartmentRouting } from '../services/routing.service.ts';
import { ensureSeeded } from '../services/seed.service.ts';
import {
  normalizeEmail,
  recordAuditLog,
  sanitizeText,
} from '../utils/sanitize.ts';
import {
  assignConversationSchema,
  createConversationSchema,
  createNoteSchema,
  escalateConversationSchema,
  resolveConversationSchema,
  sendMessageSchema,
  updateConversationSchema,
} from '../validators/schemas.ts';

export const WELCOME_MESSAGE =
  "Hello! Welcome to Support Flow AI. I'm your virtual support assistant. How can I help you today?";

async function assertConversationAccess(
  req: AuthRequest,
  conversationId: number
) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  if (req.user) {
    if (req.user.role === 'ADMIN' || req.user.role === 'AGENT') {
      return conv;
    }
    if (conv.customerId === req.user.id) {
      return conv;
    }
    throw new AppError(
      'You do not have permission to access this conversation',
      403,
      'FORBIDDEN'
    );
  }

  if (req.guestConversationId === conv.id) {
    return conv;
  }

  throw new AppError(
    'Authentication required to access this conversation',
    401,
    'UNAUTHORIZED'
  );
}

export async function createConversation(req: AuthRequest, res: Response) {
  await ensureSeeded();
  const parsed = createConversationSchema.parse(req.body ?? {});

  let customerId = req.user?.id;
  if (!customerId) {
    const guestEmail = parsed.customerEmail
      ? normalizeEmail(parsed.customerEmail)
      : `visitor-${Date.now()}-${Math.floor(Math.random() * 10000)}@guest.supportflow.local`;
    const guestName = parsed.customerName
      ? sanitizeText(parsed.customerName)
      : 'Website Visitor';

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, guestEmail))
      .limit(1);

    if (existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const [createdGuest] = await db
        .insert(users)
        .values({
          fullName: guestName,
          email: guestEmail,
          role: 'CUSTOMER',
          isActive: true,
        })
        .returning();
      customerId = createdGuest.id;
    }
  }

  const [generalDept] = await db
    .select()
    .from(departments)
    .where(eq(departments.name, 'General Support'))
    .limit(1);

  const subject = parsed.subject
    ? sanitizeText(parsed.subject)
    : parsed.initialMessage
      ? sanitizeText(parsed.initialMessage).slice(0, 80)
      : 'New Support Enquiry';

  const result = await db.transaction(async (tx) => {
    const [conv] = await tx
      .insert(conversations)
      .values({
        customerId: customerId!,
        departmentId: generalDept?.id ?? null,
        subject,
        category: parsed.category ? sanitizeText(parsed.category) : 'General',
        priority: 'MEDIUM',
        status: 'OPEN',
      })
      .returning();

    const [welcome] = await tx
      .insert(messages)
      .values({
        conversationId: conv.id,
        senderId: null,
        senderType: 'AI',
        message: WELCOME_MESSAGE,
        messageType: 'TEXT',
      })
      .returning();

    return { conversation: conv, welcomeMessage: welcome };
  });

  const guestToken = !req.user
    ? signGuestConversationToken(result.conversation.id)
    : undefined;

  return res.status(201).json({
    conversation: result.conversation,
    messages: [result.welcomeMessage],
    guestToken,
  });
}

export async function listConversations(req: AuthRequest, res: Response) {
  await ensureSeeded();

  if (!req.user && !req.guestConversationId) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const statusFilter =
    typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const deptFilter =
    typeof req.query.departmentId === 'string' && req.query.departmentId !== 'all'
      ? Number(req.query.departmentId)
      : undefined;
  const agentFilter =
    typeof req.query.agentId === 'string' && req.query.agentId !== 'all'
      ? Number(req.query.agentId)
      : undefined;
  const search =
    typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

  const conditions = [];

  if (req.user?.role === 'CUSTOMER') {
    conditions.push(eq(conversations.customerId, req.user.id));
  } else if (!req.user && req.guestConversationId) {
    conditions.push(eq(conversations.id, req.guestConversationId));
  }

  if (statusFilter && statusFilter !== 'ALL') {
    conditions.push(eq(conversations.status, statusFilter));
  }
  if (deptFilter && !Number.isNaN(deptFilter)) {
    conditions.push(eq(conversations.departmentId, deptFilter));
  }
  if (agentFilter && !Number.isNaN(agentFilter)) {
    conditions.push(eq(conversations.assignedAgentId, agentFilter));
  }
  if (search) {
    conditions.push(
      or(
        ilike(conversations.subject, `%${search}%`),
        ilike(conversations.category, `%${search}%`)
      )!
    );
  }

  const rows = await db
    .select()
    .from(conversations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(conversations.updatedAt));

  const allUsers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
    })
    .from(users);
  const allDepts = await db.select().from(departments);

  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const deptMap = new Map(allDepts.map((d) => [d.id, d]));

  const enriched = rows.map((c) => ({
    ...c,
    customer: userMap.get(c.customerId) ?? null,
    assignedAgent: c.assignedAgentId ? userMap.get(c.assignedAgentId) ?? null : null,
    department: c.departmentId ? deptMap.get(c.departmentId) ?? null : null,
  }));

  return res.json({ conversations: enriched });
}

export async function getConversationById(req: AuthRequest, res: Response) {
  await ensureSeeded();
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }

  const conv = await assertConversationAccess(req, id);

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt), asc(messages.id));

  const [customer] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, conv.customerId))
    .limit(1);

  const [department] = conv.departmentId
    ? await db
        .select()
        .from(departments)
        .where(eq(departments.id, conv.departmentId))
        .limit(1)
    : [null];

  const [assignedAgent] = conv.assignedAgentId
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          departmentId: users.departmentId,
        })
        .from(users)
        .where(eq(users.id, conv.assignedAgentId))
        .limit(1)
    : [null];

  const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'AGENT';
  const notes = isStaff
    ? await db
        .select({
          id: conversationNotes.id,
          note: conversationNotes.note,
          createdAt: conversationNotes.createdAt,
          agentId: conversationNotes.agentId,
          agentName: users.fullName,
        })
        .from(conversationNotes)
        .innerJoin(users, eq(conversationNotes.agentId, users.id))
        .where(eq(conversationNotes.conversationId, id))
        .orderBy(desc(conversationNotes.createdAt))
    : [];

  return res.json({
    conversation: {
      ...conv,
      customer: customer ?? null,
      department: department ?? null,
      assignedAgent: assignedAgent ?? null,
    },
    messages: msgRows,
    notes,
  });
}

export async function getConversationMessages(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }
  await assertConversationAccess(req, id);
  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt), asc(messages.id));
  return res.json({ messages: msgRows });
}

export async function postMessage(req: AuthRequest, res: Response) {
  await ensureSeeded();
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }

  const conv = await assertConversationAccess(req, id);
  const parsed = sendMessageSchema.parse(req.body);
  const cleanMessage = sanitizeText(parsed.message);
  const startTime = Date.now();

  const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'AGENT';

  // Agent/Admin replying directly to the customer
  if (isStaff && req.user) {
    const saved = await db.transaction(async (tx) => {
      const [agentMsg] = await tx
        .insert(messages)
        .values({
          conversationId: id,
          senderId: req.user!.id,
          senderType: 'AGENT',
          message: cleanMessage,
          messageType: 'TEXT',
        })
        .returning();

      const nextStatus =
        conv.status === 'OPEN' || conv.status === 'ESCALATED'
          ? 'ASSIGNED'
          : conv.status;

      const [updatedConv] = await tx
        .update(conversations)
        .set({
          assignedAgentId: conv.assignedAgentId ?? req.user!.id,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, id))
        .returning();

      return { agentMsg, updatedConv };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'AGENT_REPLIED',
      entityType: 'CONVERSATION',
      entityId: id,
    });

    return res.status(201).json({
      customerMessage: null,
      replyMessage: saved.agentMsg,
      conversation: saved.updatedConv,
    });
  }

  // Customer (or guest) sending message -> store message, then run AI RAG + routing if not already handed to human agent exclusively
  const historyRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt), asc(messages.id));

  const [customerMsg] = await db
    .insert(messages)
    .values({
      conversationId: id,
      senderId: req.user?.id ?? conv.customerId,
      senderType: 'CUSTOMER',
      message: cleanMessage,
      messageType: 'TEXT',
    })
    .returning();

  // If a human agent has already replied or conversation is escalated/assigned to a human, still keep history and let user know or allow AI if still OPEN/PENDING
  if (conv.status === 'ESCALATED' || conv.status === 'ASSIGNED') {
    const [updatedConv] = await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();

    return res.status(201).json({
      customerMessage: customerMsg,
      replyMessage: null,
      conversation: updatedConv,
      awaitingHumanAgent: true,
    });
  }

  const activeDepts = await db
    .select()
    .from(departments)
    .where(eq(departments.isActive, true));

  const aiResult = await generateGroundedSupportReply({
    customerMessage: cleanMessage,
    conversationHistory: historyRows.map((m) => ({
      senderType: m.senderType,
      message: m.message,
    })),
    availableDepartments: activeDepts.map((d) => d.name),
  });

  const routing = await resolveDepartmentRouting({
    messageText: cleanMessage,
    classifiedCategory: aiResult.category,
    aiRecommendedDepartment: aiResult.recommendedDepartment,
  });

  const elapsedMs = Math.max(150, Date.now() - startTime);

  const savedAi = await db.transaction(async (tx) => {
    const [aiMsg] = await tx
      .insert(messages)
      .values({
        conversationId: id,
        senderId: null,
        senderType: 'AI',
        message: aiResult.reply,
        messageType:
          aiResult.citedArticles.length > 0 ? 'KNOWLEDGE_CITATION' : 'TEXT',
        citedArticleIds:
          aiResult.citedArticles.length > 0
            ? JSON.stringify(aiResult.citedArticles)
            : null,
      })
      .returning();

    const shouldUpdateSubject =
      conv.subject === 'New Support Enquiry' || conv.subject.length < 4;

    const [updatedConv] = await tx
      .update(conversations)
      .set({
        subject: shouldUpdateSubject ? cleanMessage.slice(0, 90) : conv.subject,
        category: aiResult.category,
        departmentId: routing.departmentId ?? conv.departmentId,
        firstResponseMs: conv.firstResponseMs ?? elapsedMs,
        priority: aiResult.category === 'Complaints' ? 'HIGH' : conv.priority,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();

    return { aiMsg, updatedConv };
  });

  return res.status(201).json({
    customerMessage: customerMsg,
    replyMessage: savedAi.aiMsg,
    conversation: savedAi.updatedConv,
    aiMetadata: {
      category: aiResult.category,
      intent: aiResult.intent,
      recommendedDepartment: routing.departmentName,
      routingSource: routing.source,
      recommendEscalation:
        aiResult.recommendEscalation || aiResult.reply === NO_KB_ANSWER_FALLBACK,
      confidence: aiResult.confidence,
      citedArticles: aiResult.citedArticles,
    },
  });
}

export async function escalateConversation(req: AuthRequest, res: Response) {
  await ensureSeeded();
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }

  const conv = await assertConversationAccess(req, id);
  const parsed = escalateConversationSchema.parse(req.body);
  const customerName = sanitizeText(parsed.customerName);
  const customerEmail = normalizeEmail(parsed.customerEmail);
  const issueSummary = sanitizeText(parsed.issueSummary);

  const routing = await resolveDepartmentRouting({
    messageText: `${conv.subject} ${issueSummary}`,
    classifiedCategory: conv.category,
    aiRecommendedDepartment: 'General Support',
  });

  const result = await db.transaction(async (tx) => {
    // Link/update customer record if this was an anonymous guest placeholder or update contact name
    let targetCustomerId = conv.customerId;
    const [existingByEmail] = await tx
      .select()
      .from(users)
      .where(eq(users.email, customerEmail))
      .limit(1);

    if (existingByEmail) {
      targetCustomerId = existingByEmail.id;
      if (!existingByEmail.fullName || existingByEmail.fullName === 'Website Visitor') {
        await tx
          .update(users)
          .set({ fullName: customerName, updatedAt: new Date() })
          .where(eq(users.id, existingByEmail.id));
      }
    } else {
      const [currentCust] = await tx
        .select()
        .from(users)
        .where(eq(users.id, conv.customerId))
        .limit(1);

      if (currentCust && currentCust.email.endsWith('@guest.supportflow.local')) {
        await tx
          .update(users)
          .set({
            fullName: customerName,
            email: customerEmail,
            updatedAt: new Date(),
          })
          .where(eq(users.id, currentCust.id));
      } else {
        const [newCust] = await tx
          .insert(users)
          .values({
            fullName: customerName,
            email: customerEmail,
            role: 'CUSTOMER',
            isActive: true,
          })
          .returning();
        targetCustomerId = newCust.id;
      }
    }

    const [updatedConv] = await tx
      .update(conversations)
      .set({
        customerId: targetCustomerId,
        departmentId: routing.departmentId ?? conv.departmentId,
        status: 'ESCALATED',
        priority: conv.priority === 'LOW' ? 'MEDIUM' : conv.priority,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();

    const [escalationMsg] = await tx
      .insert(messages)
      .values({
        conversationId: id,
        senderId: null,
        senderType: 'SYSTEM',
        message: `Escalation forwarded to ${routing.departmentName} for ${customerName} (${customerEmail}). Summary: "${issueSummary}". A human support agent will review your conversation history and respond shortly.`,
        messageType: 'ESCALATION',
      })
      .returning();

    return { conversation: updatedConv, escalationMessage: escalationMsg };
  });

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'CONVERSATION_ESCALATED',
    entityType: 'CONVERSATION',
    entityId: id,
    details: `Escalated to ${routing.departmentName} (${routing.source})`,
  });

  return res.json({
    conversation: result.conversation,
    escalationMessage: result.escalationMessage,
    routedDepartment: routing.departmentName,
  });
}

export async function updateConversation(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }
  const parsed = updateConversationSchema.parse(req.body);

  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  const nextResolvedAt =
    parsed.status === 'RESOLVED' || parsed.status === 'CLOSED'
      ? existing.resolvedAt ?? new Date()
      : parsed.status
        ? null
        : existing.resolvedAt;

  const [updated] = await db
    .update(conversations)
    .set({
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.priority !== undefined ? { priority: parsed.priority } : {}),
      ...(parsed.category !== undefined ? { category: sanitizeText(parsed.category) } : {}),
      ...(parsed.departmentId !== undefined ? { departmentId: parsed.departmentId } : {}),
      ...(parsed.assignedAgentId !== undefined ? { assignedAgentId: parsed.assignedAgentId } : {}),
      ...(parsed.resolutionType !== undefined ? { resolutionType: parsed.resolutionType } : {}),
      resolvedAt: nextResolvedAt,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, id))
    .returning();

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'CONVERSATION_UPDATED',
    entityType: 'CONVERSATION',
    entityId: id,
    details: JSON.stringify(parsed),
  });

  return res.json({ conversation: updated });
}

export async function assignConversation(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }
  const parsed = assignConversationSchema.parse(req.body);

  const [dept] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, parsed.departmentId))
    .limit(1);

  if (!dept) {
    throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(conversations)
      .set({
        departmentId: parsed.departmentId,
        assignedAgentId: parsed.agentId ?? null,
        status: parsed.agentId ? 'ASSIGNED' : 'PENDING',
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();

    if (!updated) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    await tx.insert(assignments).values({
      conversationId: id,
      agentId: parsed.agentId ?? null,
      departmentId: parsed.departmentId,
      assignedBy: req.user?.id ?? null,
    });

    await tx.insert(messages).values({
      conversationId: id,
      senderId: null,
      senderType: 'SYSTEM',
      message: parsed.agentId
        ? `Conversation routed to ${dept.name} and assigned to a support agent.`
        : `Conversation transferred to ${dept.name} queue.`,
      messageType: 'TEXT',
    });

    return updated;
  });

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'CONVERSATION_ASSIGNED',
    entityType: 'CONVERSATION',
    entityId: id,
    details: `Department ${dept.name}, Agent ${parsed.agentId ?? 'unassigned'}`,
  });

  return res.json({ conversation: result });
}

export async function resolveConversation(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }
  const parsed = resolveConversationSchema.parse(req.body ?? {});

  const updated = await db.transaction(async (tx) => {
    const [conv] = await tx
      .update(conversations)
      .set({
        status: 'RESOLVED',
        resolutionType: parsed.resolutionType,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();

    if (!conv) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    if (parsed.summaryNote && req.user) {
      await tx.insert(conversationNotes).values({
        conversationId: id,
        agentId: req.user.id,
        note: `Resolution outcome (${parsed.resolutionType}): ${sanitizeText(parsed.summaryNote)}`,
      });
    }

    return conv;
  });

  await recordAuditLog({
    userId: req.user?.id ?? null,
    action: 'CONVERSATION_RESOLVED',
    entityType: 'CONVERSATION',
    entityId: id,
    details: `Resolution: ${parsed.resolutionType}`,
  });

  return res.json({ conversation: updated });
}

export async function addConversationNote(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
  }
  const parsed = createNoteSchema.parse(req.body);

  const [created] = await db
    .insert(conversationNotes)
    .values({
      conversationId: id,
      agentId: req.user!.id,
      note: sanitizeText(parsed.note),
    })
    .returning();

  return res.status(201).json({
    note: {
      ...created,
      agentName: req.user!.fullName,
    },
  });
}
