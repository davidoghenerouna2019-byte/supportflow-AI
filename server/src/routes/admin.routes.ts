import { Router } from 'express';
import {
  createAgent,
  createDepartment,
  createRoutingRule,
  deleteAgent,
  deleteDepartment,
  deleteRoutingRule,
  listAgents,
  listAuditLogs,
  listCustomers,
  listDepartments,
  listRoutingRules,
  submitContactInquiry,
  updateAgent,
  updateDepartment,
  updateRoutingRule,
} from '../controllers/admin.controller.ts';
import {
  getAnalyticsOverview,
  getConversationsAnalytics,
  getPerformanceAnalytics,
} from '../controllers/analytics.controller.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';

export const departmentsRouter = Router();
departmentsRouter.get('/', asyncHandler(listDepartments));
departmentsRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(createDepartment)
);
departmentsRouter.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(updateDepartment)
);
departmentsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(deleteDepartment)
);

export const agentsRouter = Router();
agentsRouter.use(requireAuth, requireRole('ADMIN', 'AGENT'));
agentsRouter.get('/', asyncHandler(listAgents));
agentsRouter.post('/', requireRole('ADMIN'), asyncHandler(createAgent));
agentsRouter.put('/:id', requireRole('ADMIN'), asyncHandler(updateAgent));
agentsRouter.delete('/:id', requireRole('ADMIN'), asyncHandler(deleteAgent));

export const customersRouter = Router();
customersRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'AGENT'),
  asyncHandler(listCustomers)
);

export const routingRouter = Router();
routingRouter.use(requireAuth, requireRole('ADMIN', 'AGENT'));
routingRouter.get('/', asyncHandler(listRoutingRules));
routingRouter.post('/', requireRole('ADMIN'), asyncHandler(createRoutingRule));
routingRouter.put('/:id', requireRole('ADMIN'), asyncHandler(updateRoutingRule));
routingRouter.delete('/:id', requireRole('ADMIN'), asyncHandler(deleteRoutingRule));

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireRole('ADMIN', 'AGENT'));
analyticsRouter.get('/overview', asyncHandler(getAnalyticsOverview));
analyticsRouter.get('/conversations', asyncHandler(getConversationsAnalytics));
analyticsRouter.get('/performance', asyncHandler(getPerformanceAnalytics));

export const auditRouter = Router();
auditRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(listAuditLogs)
);

export const contactRouter = Router();
contactRouter.post('/', asyncHandler(submitContactInquiry));
