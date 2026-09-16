import { z } from 'zod';

const record = z.object({
  studentId: z.string().uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
});

export const attendanceTakeSchema = z.object({ records: z.array(record).min(1).max(500) }).refine((value) => new Set(value.records.map((item) => item.studentId)).size === value.records.length, { message: 'Each student may appear only once per session.' });
export const attendanceUpdateSchema = record.omit({ studentId: true }).partial().refine((value) => value.status !== undefined || value.remarks !== undefined, { message: 'At least one attendance field is required.' });
export const attendanceRangeSchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() }).refine((value) => !value.from || !value.to || value.to > value.from, { message: 'The end of the range must be after the start.', path: ['to'] });