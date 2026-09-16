import { z } from 'zod';

const dateSchema = z.coerce.date();

const batchFields = {
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  academicYear: z.string().trim().min(4).max(20),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).default('PLANNED'),
};

export const batchCreateSchema = z.object(batchFields).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: 'End date must be on or after start date.',
  path: ['endDate'],
});

export const batchUpdateSchema = z.object(batchFields).partial();

export const batchQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const studentCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20).optional().or(z.literal('')),
  parentName: z.string().trim().max(120).optional().or(z.literal('')),
  parentPhone: z.string().trim().max(20).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
});

export const studentUpdateSchema = studentCreateSchema.omit({ email: true, password: true }).partial();

export const studentQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  batchId: z.string().uuid().optional(),
  includeArchived: z.coerce.boolean().default(false),
});