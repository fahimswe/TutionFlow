import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma.js';
import { comparePassword, createAccessToken, createRefreshToken, hashPassword, verifyRefreshToken } from '../lib/auth.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { changePasswordSchema, loginSchema, profileUpdateSchema, refreshSchema, registerSchema } from '../validators/auth.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

export function createAuthRouter() {
  const router = Router();

  router.post('/register', authLimiter, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }

    const { email, password, fullName, phone } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone: phone || null,
        role: 'TUTOR',
        tutor: { create: {} },
      },
    });

    const accessToken = createAccessToken({ id: user.id, email: user.email, role: user.role as any });
    const refreshToken = createRefreshToken({ id: user.id, email: user.email, role: user.role as any });

    return res.status(201).json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      accessToken,
      refreshToken,
    });
  });

  router.post('/login', authLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const accessToken = createAccessToken({ id: user.id, email: user.email, role: user.role as any });
    const refreshToken = createRefreshToken({ id: user.id, email: user.email, role: user.role as any });

    return res.status(200).json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      accessToken,
      refreshToken,
    });
  });

  router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    return res.status(200).json({ message: 'Logged out successfully.' });
  });

  router.post('/refresh', authLimiter, async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }

    try {
      const payload = verifyRefreshToken(parsed.data.refreshToken);

      if (payload.type !== 'refresh') {
        return res.status(401).json({ message: 'Invalid refresh token.' });
      }

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid refresh token.' });
      }

      const accessToken = createAccessToken({ id: user.id, email: user.email, role: user.role as any });
      const refreshToken = createRefreshToken({ id: user.id, email: user.email, role: user.role as any });

      return res.status(200).json({ accessToken, refreshToken });
    } catch {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }
  });

  router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  router.patch('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const parsed = profileUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(parsed.data.fullName ? { fullName: parsed.data.fullName } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
      },
    });

    return res.status(200).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    });
  });

  router.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const matches = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const newPasswordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return res.status(200).json({ message: 'Password changed successfully.' });
  });

  router.get('/admin-only', requireAuth, requireRole(['ADMIN']), (_req, res) => {
    return res.status(200).json({ message: 'Admin access granted.' });
  });

  return router;
}
