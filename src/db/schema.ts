import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').unique(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone'),
    passwordHash: text('password_hash'),
    role: text('role').notNull().default('CUSTOMER'), // ADMIN | AGENT | CUSTOMER
    departmentId: integer('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('users_role_idx').on(table.role),
    index('users_department_idx').on(table.departmentId),
  ]
);

export const conversations = pgTable(
  'conversations',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    assignedAgentId: integer('assigned_agent_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    departmentId: integer('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    subject: text('subject').notNull(),
    category: text('category').notNull().default('General'),
    priority: text('priority').notNull().default('MEDIUM'), // LOW | MEDIUM | HIGH | URGENT
    status: text('status').notNull().default('OPEN'), // OPEN | PENDING | ASSIGNED | ESCALATED | RESOLVED | CLOSED
    resolutionType: text('resolution_type'), // AI_RESOLVED | AGENT_RESOLVED | UNRESOLVED
    firstResponseMs: integer('first_response_ms'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at'),
  },
  (table) => [
    index('conversations_customer_idx').on(table.customerId),
    index('conversations_agent_idx').on(table.assignedAgentId),
    index('conversations_dept_idx').on(table.departmentId),
    index('conversations_status_idx').on(table.status),
    index('conversations_created_idx').on(table.createdAt),
  ]
);

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: integer('sender_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    senderType: text('sender_type').notNull(), // CUSTOMER | AI | AGENT | SYSTEM
    message: text('message').notNull(),
    messageType: text('message_type').notNull().default('TEXT'), // TEXT | ESCALATION | KNOWLEDGE_CITATION
    citedArticleIds: text('cited_article_ids'), // JSON array string of matched article IDs
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('messages_conversation_idx').on(table.conversationId)]
);

export const knowledgeArticles = pgTable(
  'knowledge_articles',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: text('category').notNull(),
    keywords: text('keywords').notNull().default(''),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('kb_category_idx').on(table.category),
    index('kb_published_idx').on(table.isPublished),
  ]
);

export const conversationNotes = pgTable(
  'conversation_notes',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    agentId: integer('agent_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    note: text('note').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('notes_conversation_idx').on(table.conversationId)]
);

export const assignments = pgTable(
  'assignments',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    agentId: integer('agent_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    departmentId: integer('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
    assignedBy: integer('assigned_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('assignments_conversation_idx').on(table.conversationId)]
);

export const routingRules = pgTable(
  'routing_rules',
  {
    id: serial('id').primaryKey(),
    category: text('category').notNull(),
    keywords: text('keywords').notNull(),
    departmentId: integer('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
    priority: integer('priority').notNull().default(10),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('routing_dept_idx').on(table.departmentId)]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    details: text('details'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('audit_created_idx').on(table.createdAt)]
);

export const contactInquiries = pgTable('contact_inquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company').notNull().default(''),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const quickReplies = pgTable(
  'quick_replies',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    shortcut: text('shortcut').notNull().default(''),
    category: text('category').notNull().default('General'),
    content: text('content').notNull(),
    departmentId: integer('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    createdById: integer('created_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    usageCount: integer('usage_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('quick_replies_category_idx').on(table.category),
    index('quick_replies_dept_idx').on(table.departmentId),
  ]
);

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  conversations: many(conversations),
  routingRules: many(routingRules),
  quickReplies: many(quickReplies),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  customerConversations: many(conversations, { relationName: 'customer' }),
  agentConversations: many(conversations, { relationName: 'agent' }),
  messages: many(messages),
  notes: many(conversationNotes),
  auditLogs: many(auditLogs),
  quickReplies: many(quickReplies),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    customer: one(users, {
      fields: [conversations.customerId],
      references: [users.id],
      relationName: 'customer',
    }),
    assignedAgent: one(users, {
      fields: [conversations.assignedAgentId],
      references: [users.id],
      relationName: 'agent',
    }),
    department: one(departments, {
      fields: [conversations.departmentId],
      references: [departments.id],
    }),
    messages: many(messages),
    notes: many(conversationNotes),
    assignments: many(assignments),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const conversationNotesRelations = relations(
  conversationNotes,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationNotes.conversationId],
      references: [conversations.id],
    }),
    agent: one(users, {
      fields: [conversationNotes.agentId],
      references: [users.id],
    }),
  })
);

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  conversation: one(conversations, {
    fields: [assignments.conversationId],
    references: [conversations.id],
  }),
  agent: one(users, {
    fields: [assignments.agentId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [assignments.departmentId],
    references: [departments.id],
  }),
  assignedByUser: one(users, {
    fields: [assignments.assignedBy],
    references: [users.id],
  }),
}));

export const routingRulesRelations = relations(routingRules, ({ one }) => ({
  department: one(departments, {
    fields: [routingRules.departmentId],
    references: [departments.id],
  }),
}));

export const quickRepliesRelations = relations(quickReplies, ({ one }) => ({
  department: one(departments, {
    fields: [quickReplies.departmentId],
    references: [departments.id],
  }),
  createdBy: one(users, {
    fields: [quickReplies.createdById],
    references: [users.id],
  }),
}));
