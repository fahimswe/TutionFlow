import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role } from '../types/auth.js';

export const hashPassword = async (password: string) => bcrypt.hash(password, 12);
export const comparePassword = async (password: string, hashedPassword: string) => bcrypt.compare(password, hashedPassword);

export const createAccessToken = (user: { id: string; email: string; role: Role }) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '15m', issuer: 'tutionflow' },
  );

export const createRefreshToken = (user: { id: string; email: string; role: Role }) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d', issuer: 'tutionflow' },
  );

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET, { issuer: 'tutionflow' }) as { sub: string; email: string; role: Role };

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'tutionflow' }) as { sub: string; email: string; role: Role; type?: string };
