import { z } from 'zod';

const examFields = {
  title: z.string().trim().min(2).max(160),
  batchId: z.string().uuid(),
  subjectId: z.string().uuid(),
  scheduledAt: z.coerce.date(),
  durationMin: z.number().int().positive().max(1440),
  totalMarks: z.number().positive().max(100000),
  instructions: z.string().trim().max(3000).optional().or(z.literal('')),
  syllabusTopicIds: z.array(z.string().uuid()).max(500).default([]),
};

export const examCreateSchema = z.object(examFields).refine((value) => value.scheduledAt.getTime() >= Date.now() - 60000, { message: 'Exam date cannot be in the past.', path: ['scheduledAt'] });
export const examUpdateSchema = z.object(examFields).omit({ batchId: true, syllabusTopicIds: true }).partial();
export const resultCreateSchema = z.object({ studentId: z.string().uuid(), marksObtained: z.number().min(0), remarks: z.string().trim().max(1000).optional().or(z.literal('')) });
export const resultUpdateSchema = resultCreateSchema.omit({ studentId: true }).partial();
export const resultListSchema = z.object({ subjectId: z.string().uuid().optional() });