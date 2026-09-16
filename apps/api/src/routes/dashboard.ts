import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { attendancePercentage, emptyAttendanceCounts } from '../lib/attendance.js';
import { calculateProgress } from '../lib/progress.js';
import { resultPercentage } from '../lib/grading.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';

const tutorOnly = [requireAuth, requireRole(['TUTOR'])];
function param(value: string | string[]) { return Array.isArray(value) ? value[0] : value; }
async function tutorIdFor(userId: string) { return (await prisma.tutor.findFirst({ where: { userId, deletedAt: null } }))?.id; }

async function attendanceTotals(where: Prisma.AttendanceWhereInput) {
  const rows = await prisma.attendance.groupBy({ by: ['status'], where: { ...where, deletedAt: null }, _count: { _all: true } });
  const totals = emptyAttendanceCounts();
  for (const row of rows) totals[row.status] = row._count._all;
  return totals;
}

async function syllabusSummary(tutorId: string, studentId?: string, batchId?: string) {
  const topics = await prisma.topic.findMany({ where: { deletedAt: null, chapter: { deletedAt: null, subject: { tutorId, deletedAt: null, ...(batchId ? { batchSubjects: { some: { batchId, deletedAt: null } } } : {}) } } }, select: { id: true } });
  const completed = topics.length === 0 ? 0 : await prisma.studentProgress.count({ where: { topicId: { in: topics.map((topic) => topic.id) }, deletedAt: null, status: 'COMPLETED', ...(studentId ? { studentId } : {}) } });
  const total = studentId ? await prisma.studentProgress.count({ where: { topicId: { in: topics.map((topic) => topic.id) }, studentId, deletedAt: null } }) : topics.length;
  return { completedTopics: completed, totalTopics: total, percentage: calculateProgress(completed, total) };
}

async function examSummary(tutorId: string, studentId?: string, batchId?: string) {
  const results = await prisma.examResult.findMany({ where: { deletedAt: null, ...(studentId ? { studentId } : {}), exam: { deletedAt: null, batch: { tutorId, ...(batchId ? { id: batchId } : {}) } } }, select: { marksObtained: true, exam: { select: { totalMarks: true } } } });
  const percentages = results.flatMap((item) => item.marksObtained === null ? [] : [resultPercentage(item.marksObtained, item.exam.totalMarks)]);
  return { resultCount: percentages.length, averagePercentage: percentages.length ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length * 100) / 100 : 0 };
}

async function studentAttention(tutorId: string) {
  const students = await prisma.student.findMany({ where: { tutorId, deletedAt: null }, select: { id: true, user: { select: { fullName: true, email: true } } } });
  return Promise.all(students.map(async (student) => {
    const totals = await attendanceTotals({ studentId: student.id, classSession: { batch: { tutorId } } });
    const attendance = attendancePercentage(totals);
    const exams = await examSummary(tutorId, student.id);
    const reasons = [attendance < 75 ? `Attendance ${attendance}%` : '', exams.resultCount > 0 && exams.averagePercentage < 60 ? `Exam average ${exams.averagePercentage}%` : ''].filter(Boolean);
    return reasons.length ? { id: student.id, name: student.user.fullName, email: student.user.email, attendance, examAverage: exams.averagePercentage, reasons } : null;
  })).then((items) => items.filter((item): item is NonNullable<typeof item> => item !== null).slice(0, 8));
}

async function dashboardFor(tutorId: string) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60000);
  const [todayClasses, upcomingClasses, upcomingExams, activeBatches, totalStudents, attendance, syllabus, exams, attention, batches] = await Promise.all([
    prisma.classSession.findMany({ where: { batch: { tutorId }, deletedAt: null, scheduledAt: { gte: todayStart, lt: tomorrow }, status: { not: 'CANCELLED' } }, include: { batch: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } }, topic: { select: { id: true, title: true } } }, orderBy: { scheduledAt: 'asc' } }),
    prisma.classSession.findMany({ where: { batch: { tutorId }, deletedAt: null, scheduledAt: { gte: tomorrow, lt: nextWeek }, status: { not: 'CANCELLED' } }, include: { batch: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } }, topic: { select: { id: true, title: true } } }, orderBy: { scheduledAt: 'asc' }, take: 6 }),
    prisma.exam.findMany({ where: { batch: { tutorId }, deletedAt: null, scheduledAt: { gte: now } }, include: { batch: { select: { id: true, name: true } }, syllabus: { where: { deletedAt: null }, include: { subject: { select: { name: true } } }, take: 1 } }, orderBy: { scheduledAt: 'asc' }, take: 6 }),
    prisma.batch.count({ where: { tutorId, deletedAt: null, status: { not: 'ARCHIVED' } } }),
    prisma.student.count({ where: { tutorId, deletedAt: null } }),
    attendanceTotals({ classSession: { batch: { tutorId } } }),
    syllabusSummary(tutorId),
    examSummary(tutorId),
    studentAttention(tutorId),
    prisma.batch.findMany({ where: { tutorId, deletedAt: null, status: { not: 'ARCHIVED' } }, select: { id: true, name: true, status: true, enrollments: { where: { deletedAt: null }, select: { studentId: true } } }, orderBy: { name: 'asc' } }),
  ]);
  const batchAnalytics = await Promise.all(batches.map(async (batch) => ({ id: batch.id, name: batch.name, status: batch.status, studentCount: new Set(batch.enrollments.map((item) => item.studentId)).size, attendance: attendancePercentage(await attendanceTotals({ classSession: { batchId: batch.id } })), syllabus: await syllabusSummary(tutorId, undefined, batch.id), exams: await examSummary(tutorId, undefined, batch.id), upcomingClasses: await prisma.classSession.count({ where: { batchId: batch.id, deletedAt: null, status: 'SCHEDULED', scheduledAt: { gte: now, lt: nextWeek } } }), upcomingExams: await prisma.exam.count({ where: { batchId: batch.id, deletedAt: null, scheduledAt: { gte: now, lt: nextWeek } } }) })));
  return { generatedAt: now, todayClasses, upcomingClasses, upcomingExams, metrics: { activeBatches, totalStudents, attendance: attendancePercentage(attendance), attendanceTotals: attendance, syllabus, examAverage: exams.averagePercentage }, studentsNeedingAttention: attention, batches: batchAnalytics };
}

export function createDashboardRouter() {
  const router = Router();
  router.get('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    return res.json(await dashboardFor(tutorId));
  });
  router.get('/students/:studentId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const student = tutorId ? await prisma.student.findFirst({ where: { id: param(req.params.studentId), tutorId, deletedAt: null }, include: { user: { select: { id: true, fullName: true, email: true } } } }) : null;
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    const [attendance, syllabus, exams, recentResults] = await Promise.all([attendanceTotals({ studentId: student.id, classSession: { batch: { tutorId: tutorId! } } }), syllabusSummary(tutorId!, student.id), examSummary(tutorId!, student.id), prisma.examResult.findMany({ where: { studentId: student.id, deletedAt: null, exam: { batch: { tutorId: tutorId! } } }, include: { exam: { select: { id: true, title: true, scheduledAt: true, totalMarks: true } } }, orderBy: { createdAt: 'desc' }, take: 6 })]);
    return res.json({ student, attendance: { totals: attendance, percentage: attendancePercentage(attendance) }, syllabus, examPerformance: exams, recentResults, performanceTrend: recentResults.slice().reverse().map((item) => ({ examId: item.examId, percentage: item.marksObtained === null ? null : resultPercentage(item.marksObtained, item.exam.totalMarks) })) });
  });
  router.get('/batches/:batchId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const batch = tutorId ? await prisma.batch.findFirst({ where: { id: param(req.params.batchId), tutorId, deletedAt: null }, select: { id: true, name: true, status: true } }) : null;
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    const [attendance, syllabus, exams, upcomingClasses, upcomingExams, studentCount] = await Promise.all([attendanceTotals({ classSession: { batchId: batch.id } }), syllabusSummary(tutorId!, undefined, batch.id), examSummary(tutorId!, undefined, batch.id), prisma.classSession.findMany({ where: { batchId: batch.id, deletedAt: null, status: 'SCHEDULED', scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: 'asc' }, take: 6 }), prisma.exam.findMany({ where: { batchId: batch.id, deletedAt: null, scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: 'asc' }, take: 6 }), prisma.enrollment.count({ where: { batchId: batch.id, deletedAt: null } })]);
    return res.json({ batch, studentCount, attendance: { totals: attendance, percentage: attendancePercentage(attendance) }, syllabus, examPerformance: exams, upcomingClasses, upcomingExams });
  });
  return router;
}