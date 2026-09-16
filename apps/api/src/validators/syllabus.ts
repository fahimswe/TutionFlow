import { z } from 'zod';

export const subjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const subjectUpdateSchema = subjectSchema.partial();
export const chapterSchema = z.object({ title: z.string().trim().min(2).max(160), description: z.string().trim().max(1000).optional().or(z.literal('')), order: z.number().int().positive().optional() });
export const topicSchema = z.object({ title: z.string().trim().min(2).max(160), description: z.string().trim().max(1000).optional().or(z.literal('')), order: z.number().int().positive().optional() });
export const reorderSchema = z.object({ order: z.number().int().positive() });
export const progressSchema = z.object({ status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']) });