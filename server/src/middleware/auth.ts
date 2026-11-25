import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../../../src/lib/firebase-admin.ts';
import { db } from '../../../src/db/index.ts';
import { users } from '../../../src/db/schema.ts';
import { getJwtSecret, OWNER_ADMIN_EMAILS } from '../config/env.ts';
import { normalizeEmail } from '../utils/sanitize.ts';

export type UserRole = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export interface AuthenticatedUser {
  id: number;
  uid: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: number | null;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  guestConversationId?: number;
}

interface JwtPayload {
  userId?: number;
  email?: string;
  role?: UserRole;
  guestConversationId?: number;
  tokenType?: 'USER' | 'GUEST_CHAT';
}

export function signUserToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'USER',
    },
    getJwtSecret(),
    { expiresIn: '24h' }
  );
}

export function signGuestConversationToken(conversationId: number): string {
  return jwt.sign(
    {
      guestConversationId: conversationId,
      tokenType: 'GUEST_CHAT',
    },
    getJwtSecret(),
    { expiresIn: '24h' }
  );
}

export async function syncFirebaseUserToDb(params: {
  uid: string;
  email: string;
  fullName?: string;
}): Promise<AuthenticatedUser> {
  const email = normalizeEmail(params.email);
  const defaultRole: UserRole = OWNER_ADMIN_EMAILS.has(email) ? 'ADMIN' : 'CUSTOMER';
  const fallbackName = params.fullName?.trim() || email.split('@')[0] || 'User';

  const existingByEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingByEmail.length > 0) {
    const existing = existingByEmail[0];
    const [updated] = await db
      .update(users)
      .set({
        uid: existing.uid ?? params.uid,
        fullName: existing.fullName || fallbackName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();

    return {
      id: updated.id,
      uid: updated.uid,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role as UserRole,
      departmentId: updated.departmentId,
      isActive: updated.isActive,
    };
  }

  const [inserted] = await db
    .insert(users)
    .values({
      uid: params.uid,
      email,
      fullName: fallbackName,
      role: defaultRole,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    id: inserted.id,
    uid: inserted.uid,
    email: inserted.email,
    fullName: inserted.fullName,
    role: inserted.role as UserRole,
    departmentId: inserted.departmentId,
    isActive: inserted.isActive,
  };
}

async function resolveBearerToken(token: string): Promise<{
  user?: AuthenticatedUser;
  guestConversationId?: number;
}> {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (decoded.tokenType === 'GUEST_CHAT' && decoded.guestConversationId) {
      return { guestConversationId: decoded.guestConversationId };
    }
    if (decoded.tokenType === 'USER' && decoded.userId) {
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);
      if (!dbUser || !dbUser.isActive) {
        return {};
      }
      return {
        user: {
          id: dbUser.id,
          uid: dbUser.uid,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role as UserRole,
          departmentId: dbUser.departmentId,
          isActive: dbUser.isActive,
        },
      };
    }
  } catch {
    // Not a local HS256 JWT; try Firebase Admin token verification next.
  }

  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    if (!decodedFirebase.email) {
      return {};
    }
    const dbUser = await syncFirebaseUserToDb({
      uid: decodedFirebase.uid,
      email: decodedFirebase.email,
      fullName: decodedFirebase.name,
    });
    if (!dbUser.isActive) {
      return {};
    }
    return { user: dbUser };
  } catch {
    return {};
  }
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const resolved = await resolveBearerToken(token);
    if (!resolved.user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
    req.user = resolved.user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const resolved = await resolveBearerToken(token);
      if (resolved.user) {
        req.user = resolved.user;
      }
      if (resolved.guestConversationId) {
        req.guestConversationId = resolved.guestConversationId;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'You do not have permission to perform this action',
      });
    }
    next();
  };
}
