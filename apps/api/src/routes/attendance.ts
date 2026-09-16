import { Router } from 'express';
import { AttendanceStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { attendancePercentage, emptyAttendanceCounts } from '../lib/attendance.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { attendanceRangeSchema, attendanceTakeSchema, attendanceUpdateSchema } from '../validators/attendance.js';

const tutorOnly = [requireAuth, requireRole(['TUTOR'])];
function param(value: string | string[]) { return Array.isArray(value) ? value[0] : value; }
async function tutorIdFor(userId: string) { return (await prisma.tutor.findFirst({ where: { userId, deletedAt: null } }))?.id; }

async function ownedSession(tutorId: string, sessionId: string) {
  return prisma.classSession.findFirst({ where: { id: sessionId, deletedAt: null, batch: { tutorId } }, include: { batch: true } });
}

async function counts(where: Prisma.AttendanceWhereInput) {
  const rows = await prisma.attendance.groupBy({ by: ['status'], where: { ...where, deletedAt: null }, _count: { _all: true } });
  const result = emptyAttendanceCounts();
  for (const row of rows) result[row.status] = row._count._all;
  return result;
}

export function createAttendanceRouter() {
  const router = Router();

  router.get('/sessions/:sessionId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const session = tutorId ? await ownedSession(tutorId, param(req.params.sessionId)) : null;
    if (!session) return res.status(404).json({ message: 'Class session not found.' });
    const records = await prisma.attendance.findMany({ where: { classSessionId: session.id, deletedAt: null }, include: { student: { include: { user: { select: { id: true, fullName: true, email: true } } } } }, orderBy: { createdAt: 'asc' } });
    const totals = await counts({ classSessionId: session.id });
    return res.json({ session, records, totals, percentage: attendancePercentage(totals) });
  });

  router.post('/sessions/:sessionId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = attendanceTakeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const session = tutorId ? await ownedSession(tutorId, param(req.params.sessionId)) : null;
    if (!session) return res.status(404).json({ message: 'Class session not found.' });
    const studentIds = parsed.data.records.map((item) => item.studentId);
    const enrollments = await prisma.enrollment.findMany({ where: { batchId: session.batchId, studentId: { in: studentIds }, deletedAt: null }, select: { studentId: true } });
    if (enrollments.length !== studentIds.length) return res.status(400).json({ message: 'Attendance can only be taken for enrolled students.' });
    const existing = await prisma.attendance.findFirst({ where: { classSessionId: session.id, studentId: { in: studentIds }, deletedAt: null } });
    if (existing) return res.status(409).json({ message: 'Attendance already exists for one or more students in this session.' });
    try {
      const records = await prisma.$transaction(parsed.data.records.map((item) => prisma.attendance.create({ data: { classSessionId: session.id, studentId: item.studentId, status: item.status as AttendanceStatus, remarks: item.remarks || null } })));
      return res.status(201).json(records);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'Duplicate attendance record.' });
      throw error;
    }
  });

  router.patch('/:attendanceId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = attendanceUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const existing = tutorId ? await prisma.attendance.findFirst({ where: { id: param(req.params.attendanceId), deletedAt: null, classSession: { batch: { tutorId } } } }) : null;
    if (!existing) return res.status(404).json({ message: 'Attendance record not found.' });
    return res.json(await prisma.attendance.update({ where: { id: existing.id }, data: { ...(parsed.data.status ? { status: parsed.data.status as AttendanceStatus } : {}), ...(parsed.data.remarks !== undefined ? { remarks: parsed.data.remarks || null } : {}) } }));
  });

  router.get('/students/:studentId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = attendanceRangeSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const student = tutorId ? await prisma.student.findFirst({ where: { id: param(req.params.studentId), tutorId, deletedAt: null } }) : null;
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    const sessionFilter = { batch: { tutorId }, ...(parsed.data.from || parsed.data.to ? { scheduledAt: { ...(parsed.data.from ? { gte: parsed.data.from } : {}), ...(parsed.data.to ? { lt: parsed.data.to } : {}) } } : {}) };
    const records = await prisma.attendance.findMany({ where: { studentId: student.id, deletedAt: null, classSession: sessionFilter }, include: { classSession: { include: { batch: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } }, topic: { select: { id: true, title: true } } } } }, orderBy: { classSession: { scheduledAt: 'desc' } } });
    const totals = await counts({ studentId: student.id, classSession: sessionFilter });
    return res.json({ student, records, totals, percentage: attendancePercentage(totals) });
  });

  router.get('/batches/:batchId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = attendanceRangeSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const batch = tutorId ? await prisma.batch.findFirst({ where: { id: param(req.params.batchId), tutorId, deletedAt: null } }) : null;
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    const range = parsed.data.month ? { gte: new Date(`${parsed.data.month}-01T00:00:00.000Z`), lt: new Date(new Date(`${parsed.data.month}-01T00:00:00.000Z`).setUTCMonth(new Date(`${parsed.data.month}-01T00:00:00.000Z`).getUTCMonth() + 1)) } : parsed.data.from || parsed.data.to ? { ...(parsed.data.from ? { gte: parsed.data.from } : {}), ...(parsed.data.to ? { lt: parsed.data.to } : {}) } : undefined;
    const totals = await counts({ classSession: { batchId: batch.id, ...(range ? { scheduledAt: range } : {}) } });
    const byStudent = await prisma.student.findMany({ where: { tutorId, deletedAt: null, enrollments: { some: { batchId: batch.id, deletedAt: null } } }, select: { id: true, user: { select: { fullName: true, email: true } } } });
    const students = await Promise.all(byStudent.map(async (student) => { const studentTotals = await counts({ studentId: student.id, classSession: { batchId: batch.id, ...(range ? { scheduledAt: range } : {}) } }); return { ...student, totals: studentTotals, percentage: attendancePercentage(studentTotals) }; }));
    return res.json({ batch, totals, percentage: attendancePercentage(totals), monthly: parsed.data.month || null, students });
  });

  return router;
}