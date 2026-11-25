import { Router } from 'express';
import {
  addConversationNote,
  assignConversation,
  createConversation,
  escalateConversation,
  getConversationById,
  getConversationMessages,
  listConversations,
  postMessage,
  resolveConversation,
  updateConversation,
} from '../controllers/conversations.controller.ts';
import {
  optionalAuth,
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';

export const conversationsRouter = Router();

conversationsRouter.post('/', optionalAuth, asyncHandler(createConversation));
conversationsRouter.get('/', optionalAuth, asyncHandler(listConversations));
conversationsRouter.get('/:id', optionalAuth, asyncHandler(getConversationById));
conversationsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'AGENT'),
  asyncHandler(updateConversation)
);
conversationsRouter.post(
  '/:id/assign',
  requireAuth,
  requireRole('ADMIN', 'AGENT'),
  asyncHandler(assignConversation)
);
conversationsRouter.post(
  '/:id/resolve',
  requireAuth,
  requireRole('ADMIN', 'AGENT'),
  asyncHandler(resolveConversation)
);
conversationsRouter.post(
  '/:id/escalate',
  optionalAuth,
  asyncHandler(escalateConversation)
);
conversationsRouter.post(
  '/:id/notes',
  requireAuth,
  requireRole('ADMIN', 'AGENT'),
  asyncHandler(addConversationNote)
);
conversationsRouter.post('/:id/messages', optionalAuth, asyncHandler(postMessage));
conversationsRouter.get(
  '/:id/messages',
  optionalAuth,
  asyncHandler(getConversationMessages)
);
