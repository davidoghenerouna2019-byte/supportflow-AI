import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { errorHandler, requestLogger } from './middleware/errorHandler.ts';
import {
  agentsRouter,
  analyticsRouter,
  auditRouter,
  contactRouter,
  customersRouter,
  departmentsRouter,
  routingRouter,
} from './routes/admin.routes.ts';
import { authRouter } from './routes/auth.routes.ts';
import { conversationsRouter } from './routes/conversations.routes.ts';
import { knowledgeRouter } from './routes/knowledge.routes.ts';
import { quickRepliesRouter } from './routes/quickReplies.routes.ts';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  const allowedOrigins = new Set(
    [process.env.APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000']
      .filter(Boolean)
      .map((u) => u!.replace(/\/$/, ''))
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (
          allowedOrigins.has(normalized) ||
          normalized.endsWith('.run.app') ||
          normalized.startsWith('http://localhost:')
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: false,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down and try again shortly.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again later.' },
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Support Flow AI' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/knowledge', knowledgeRouter);
  app.use('/api/departments', departmentsRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/routing-rules', routingRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/audit-logs', auditRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/quick-replies', quickRepliesRouter);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  app.use(errorHandler);

  return app;
}
