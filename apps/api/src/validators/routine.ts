import { z } from 'zod';

const dateTime = z.coerce.date();
const sessionFields = {
  batchId: z.string().uuid(),
  subjectId: z.string().uuid(),
  topicId: z.string().uuid(),
  title: z.string().trim().max(160).optional().or(z.literal('')),
  startAt: dateTime,
  endAt: dateTime,
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  recurrence: z.object({ frequency: z.literal('WEEKLY'), occurrences: z.number().int().min(2).max(52) }).optional(),
};

export const sessionCreateSchema = z.object(sessionFields).refine((value) => value.endAt > value.startAt, { message: 'End time must be after start time.', path: ['endAt'] });

export const sessionUpdateSchema = z.object(sessionFields).omit({ batchId: true, recurrence: true }).partial();

export const calendarQuerySchema = z.object({
  view: z.enum(['day', 'week', 'month']).default('week'),
  date: dateTime.default(new Date()),
  batchId: z.string().uuid().optional(),
});