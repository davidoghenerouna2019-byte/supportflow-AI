import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import { users } from '../../../src/db/schema.ts';
import { adminAuth } from '../../../src/lib/firebase-admin.ts';
import {
  type AuthRequest,
  signUserToken,
  syncFirebaseUserToDb,
} from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { ensureSeeded } from '../services/seed.service.ts';
import {
  normalizeEmail,
  recordAuditLog,
  sanitizeText,
} from '../utils/sanitize.ts';
import { loginSchema, registerSchema } from '../validators/schemas.ts';

function toSafeUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    uid: u.uid,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    departmentId: u.departmentId,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

export async function register(req: Request, res: Response) {
  await ensureSeeded();
  const parsed = registerSchema.parse(req.body);
  const email = normalizeEmail(parsed.email);
  const fullName = sanitizeText(parsed.fullName);
  const phone = parsed.phone ? sanitizeText(parsed.phone) : null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      fullName,
      email,
      phone,
      passwordHash,
      role: 'CUSTOMER',
      isActive: true,
    })
    .returning();

  const token = signUserToken({
    id: created.id,
    uid: created.uid,
    email: created.email,
    fullName: created.fullName,
    role: created.role as 'CUSTOMER',
    departmentId: created.departmentId,
    isActive: created.isActive,
  });

  await recordAuditLog({
    userId: created.id,
    action: 'USER_REGISTERED',
    entityType: 'USER',
    entityId: created.id,
    details: `Customer account registered: ${created.email}`,
  });

  return res.status(201).json({
    token,
    user: toSafeUser(created),
  });
}

export async function login(req: Request, res: Response) {
  await ensureSeeded();
  const parsed = loginSchema.parse(req.body);
  const email = normalizeEmail(parsed.email);

  const [found] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!found || !found.passwordHash) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!found.isActive) {
    throw new AppError(
      'This account has been deactivated. Please contact an administrator.',
      403,
      'ACCOUNT_INACTIVE'
    );
  }

  const valid = await bcrypt.compare(parsed.password, found.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const token = signUserToken({
    id: found.id,
    uid: found.uid,
    email: found.email,
    fullName: found.fullName,
    role: found.role as 'ADMIN' | 'AGENT' | 'CUSTOMER',
    departmentId: found.departmentId,
    isActive: found.isActive,
  });

  await recordAuditLog({
    userId: found.id,
    action: 'USER_LOGGED_IN',
    entityType: 'USER',
    entityId: found.id,
    details: `Password login for ${found.role}`,
  });

  return res.json({
    token,
    user: toSafeUser(found),
  });
}

export async function firebaseSync(req: Request, res: Response) {
  await ensureSeeded();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Firebase ID token is required.', 401, 'MISSING_TOKEN');
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  const decoded = await adminAuth.verifyIdToken(idToken).catch(() => {
    throw new AppError('Invalid Firebase ID token.', 401, 'INVALID_FIREBASE_TOKEN');
  });

  if (!decoded.email) {
    throw new AppError('Google account must include an email address.', 400, 'MISSING_EMAIL');
  }

  const synced = await syncFirebaseUserToDb({
    uid: decoded.uid,
    email: decoded.email,
    fullName: decoded.name,
  });

  if (!synced.isActive) {
    throw new AppError('This account has been deactivated.', 403, 'ACCOUNT_INACTIVE');
  }

  await recordAuditLog({
    userId: synced.id,
    action: 'USER_GOOGLE_SIGN_IN',
    entityType: 'USER',
    entityId: synced.id,
    details: `Google Sign-In synced for ${synced.role}`,
  });

  return res.json({
    user: synced,
  });
}

export async function logout(req: AuthRequest, res: Response) {
  if (req.user) {
    await recordAuditLog({
      userId: req.user.id,
      action: 'USER_LOGGED_OUT',
      entityType: 'USER',
      entityId: req.user.id,
    });
  }
  return res.json({ ok: true });
}

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!dbUser) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  return res.json({ user: toSafeUser(dbUser) });
}
