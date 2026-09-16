import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(8).max(20).optional().or(z.literal('')),
  role: z.enum(['TUTOR', 'ADMIN']).default('TUTOR'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(8).max(20).optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
