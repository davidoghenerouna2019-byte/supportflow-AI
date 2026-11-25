import { Router } from 'express';
import {
  firebaseSync,
  getMe,
  login,
  logout,
  register,
} from '../controllers/auth.controller.ts';
import { requireAuth } from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/firebase-sync', asyncHandler(firebaseSync));
authRouter.post('/logout', requireAuth, asyncHandler(logout));
authRouter.get('/me', requireAuth, asyncHandler(getMe));
