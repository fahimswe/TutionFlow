import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long').default('local-development-secret-key-123456'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long').default('local-refresh-secret-key-1234567890'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').default('file:./dev.db'),
}).passthrough();

export const env = envSchema.parse(process.env);
