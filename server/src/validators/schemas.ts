import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().email('Valid email address is required').max(160),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: z.string().max(40).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createConversationSchema = z.object({
  subject: z.string().min(2).max(200).optional(),
  initialMessage: z.string().min(1).max(4000).optional(),
  customerName: z.string().min(2).max(120).optional(),
  customerEmail: z.string().email().max(160).optional(),
  category: z.string().max(80).optional(),
});

export const updateConversationSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'ASSIGNED', 'ESCALATED', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().min(1).max(80).optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  assignedAgentId: z.number().int().positive().nullable().optional(),
  resolutionType: z.enum(['AI_RESOLVED', 'AGENT_RESOLVED', 'UNRESOLVED']).nullable().optional(),
});

export const assignConversationSchema = z.object({
  agentId: z.number().int().positive().nullable().optional(),
  departmentId: z.number().int().positive(),
});

export const resolveConversationSchema = z.object({
  resolutionType: z.enum(['AI_RESOLVED', 'AGENT_RESOLVED', 'UNRESOLVED']).default('AGENT_RESOLVED'),
  summaryNote: z.string().max(1000).optional(),
});

export const escalateConversationSchema = z.object({
  customerName: z.string().min(2, 'Please provide your name').max(120),
  customerEmail: z.string().email('Please provide a valid email address').max(160),
  issueSummary: z.string().min(5, 'Please briefly describe your issue').max(2000),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(4000),
});

export const createNoteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(2000),
});

export const knowledgeArticleSchema = z.object({
  title: z.string().min(3).max(200),
  question: z.string().min(5).max(1000),
  answer: z.string().min(10).max(8000),
  category: z.string().min(2).max(80),
  keywords: z.string().max(500).default(''),
  isPublished: z.boolean().default(true),
});

export const departmentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).default(''),
  isActive: z.boolean().default(true),
});

export const createAgentSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
  departmentId: z.number().int().positive().nullable().optional(),
  role: z.enum(['AGENT', 'ADMIN']).default('AGENT'),
  isActive: z.boolean().default(true),
});

export const updateAgentSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  email: z.string().email().max(160).optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  role: z.enum(['AGENT', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
});

export const routingRuleSchema = z.object({
  category: z.string().min(2).max(80),
  keywords: z.string().min(1).max(500),
  departmentId: z.number().int().positive(),
  priority: z.number().int().min(1).max(100).default(10),
  isActive: z.boolean().default(true),
});

export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(120),
  email: z.string().email('Valid email is required').max(160),
  company: z.string().max(120).optional().default(''),
  message: z.string().min(10, 'Message must be at least 10 characters').max(3000),
});

export const quickReplySchema = z.object({
  title: z.string().min(2, 'Template title must be at least 2 characters').max(120),
  shortcut: z
    .string()
    .max(40)
    .optional()
    .default(''),
  category: z.string().min(2).max(60).default('General'),
  content: z.string().min(5, 'Template message must be at least 5 characters').max(4000),
  departmentId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateQuickReplySchema = quickReplySchema.partial();
