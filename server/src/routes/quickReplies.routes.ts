import { Router } from 'express';
import {
  createQuickReply,
  deleteQuickReply,
  listQuickReplies,
  recordQuickReplyUsage,
  updateQuickReply,
} from '../controllers/quickReplies.controller.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';

export const quickRepliesRouter = Router();

quickRepliesRouter.use(requireAuth, requireRole('ADMIN', 'AGENT'));

quickRepliesRouter.get('/', asyncHandler(listQuickReplies));
quickRepliesRouter.post('/', asyncHandler(createQuickReply));
quickRepliesRouter.put('/:id', asyncHandler(updateQuickReply));
quickRepliesRouter.delete('/:id', asyncHandler(deleteQuickReply));
quickRepliesRouter.post('/:id/use', asyncHandler(recordQuickReplyUsage));
