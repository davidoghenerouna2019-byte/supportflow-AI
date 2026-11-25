import { Router } from 'express';
import {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  updateKnowledge,
} from '../controllers/knowledge.controller.ts';
import {
  optionalAuth,
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';

export const knowledgeRouter = Router();

knowledgeRouter.get('/', optionalAuth, asyncHandler(listKnowledge));
knowledgeRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'AGENT'),
  asyncHandler(createKnowledge)
);
knowledgeRouter.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'AGENT'),
  asyncHandler(updateKnowledge)
);
knowledgeRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(deleteKnowledge)
);
