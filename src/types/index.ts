export type UserRole = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export type ConversationStatus =
  | 'OPEN'
  | 'PENDING'
  | 'ASSIGNED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export interface User {
  id: number;
  uid?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  departmentId: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  agentCount?: number;
  conversationCount?: number;
  openCount?: number;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  question: string;
  answer: string;
  category: string;
  keywords: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: number;
  conversationId: number;
  senderId: number | null;
  senderType: 'CUSTOMER' | 'AI' | 'AGENT' | 'SYSTEM';
  message: string;
  messageType: 'TEXT' | 'ESCALATION' | 'KNOWLEDGE_CITATION';
  citedArticleIds?: string | null;
  createdAt: string;
}

export interface ConversationNote {
  id: number;
  conversationId: number;
  agentId: number;
  agentName: string;
  note: string;
  createdAt: string;
}

export interface Conversation {
  id: number;
  customerId: number;
  assignedAgentId: number | null;
  departmentId: number | null;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: ConversationStatus;
  resolutionType: 'AI_RESOLVED' | 'AGENT_RESOLVED' | 'UNRESOLVED' | null;
  firstResponseMs: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  customer?: {
    id: number;
    fullName: string;
    email: string;
    phone?: string | null;
    createdAt?: string;
  } | null;
  assignedAgent?: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  department?: Department | null;
}

export interface RoutingRule {
  id: number;
  category: string;
  keywords: string;
  departmentId: number;
  departmentName?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuickReply {
  id: number;
  title: string;
  shortcut: string;
  category: string;
  content: string;
  departmentId: number | null;
  departmentName?: string | null;
  createdById: number | null;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsOverview {
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  activeCustomers: number;
  totalAgents: number;
  aiResolvedCount: number;
  agentResolvedCount: number;
  aiResolutionRate: number;
  escalationRate: number;
  avgFirstResponseMs: number;
  avgResolutionMinutes: number;
  proposedTargets: {
    firstResponseReductionTarget: string;
    aiResolutionTarget: string;
  };
}
