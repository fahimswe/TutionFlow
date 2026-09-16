import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { defaultGradeBands, gradeForPercentage, resultPercentage, resultSummary } from '../lib/grading.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { examCreateSchema, examUpdateSchema, resultCreateSchema, resultListSchema, resultUpdateSchema } from '../validators/exams.js';

const tutorOnly = [requireAuth, requireRole(['TUTOR'])];
function param(value: string | string[]) { return Array.isArray(value) ? value[0] : value; }
async function tutorIdFor(userId: string) { return (await prisma.tutor.findFirst({ where: { userId, deletedAt: null } }))?.id; }

async function examContext(tutorId: string, batchId: string, subjectId: string, topicIds: string[]) {
  const [batch, subject, assignment, topics] = await Promise.all([
    prisma.batch.findFirst({ where: { id: batchId, tutorId, deletedAt: null } }),
    prisma.subject.findFirst({ where: { id: subjectId, tutorId, deletedAt: null } }),
    prisma.batchSubject.findUnique({ where: { batchId_subjectId: { batchId, subjectId } } }),
    prisma.topic.findMany({ where: { id: { in: topicIds }, deletedAt: null, chapter: { subjectId } }, select: { id: true } }),
  ]);
  return batch && subject && assignment && !assignment.deletedAt && topics.length === topicIds.length ? { batch, subject } : null;
}

const examInclude = { batch: { select: { id: true, name: true, code: true } }, syllabus: { where: { deletedAt: null }, include: { subject: { select: { id: true, name: true } }, chapter: { select: { id: true, title: true } }, topic: { select: { id: true, title: true } } } }, results: { where: { deletedAt: null }, include: { student: { include: { user: { select: { id: true, fullName: true, email: true } } } } } } };

export function createExamRouter() {
  const router = Router();

  router.get('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    return res.json(await prisma.exam.findMany({ where: { batch: { tutorId }, deletedAt: null }, include: examInclude, orderBy: { scheduledAt: 'desc' } }));
  });

  router.post('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = examCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    const { batchId, subjectId, syllabusTopicIds, instructions, ...data } = parsed.data;
    const context = await examContext(tutorId, batchId, subjectId, syllabusTopicIds);
    if (!context) return res.status(400).json({ message: 'Batch, subject, and syllabus topics must belong to the tutor and subject must be assigned to the batch.' });
    const topics = syllabusTopicIds.length ? await prisma.topic.findMany({ where: { id: { in: syllabusTopicIds } }, select: { id: true, chapterId: true } }) : [];
    const syllabus = topics.length ? topics.map((topic) => ({ subjectId, chapterId: topic.chapterId, topicId: topic.id })) : [{ subjectId }];
    try {
      const exam = await prisma.exam.create({ data: { ...data, batchId, title: data.title, type: 'UNIT_TEST', passingMarks: 0, instructions: instructions || null, syllabus: { create: syllabus } }, include: examInclude });
      return res.status(201).json(exam);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'Duplicate exam syllabus assignment.' });
      throw error;
    }
  });

  router.get('/:examId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const exam = tutorId ? await prisma.exam.findFirst({ where: { id: param(req.params.examId), batch: { tutorId }, deletedAt: null }, include: examInclude }) : null;
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    const marks = exam.results.flatMap((result) => result.marksObtained === null ? [] : [result.marksObtained]);
    return res.json({ ...exam, summary: resultSummary(marks, exam.totalMarks), gradeBands: defaultGradeBands });
  });

  router.patch('/:examId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = examUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const exam = tutorId ? await prisma.exam.findFirst({ where: { id: param(req.params.examId), batch: { tutorId }, deletedAt: null } }) : null;
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    return res.json(await prisma.exam.update({ where: { id: exam.id }, data: { ...parsed.data, instructions: parsed.data.instructions === '' ? null : parsed.data.instructions }, include: examInclude }));
  });

  router.post('/:examId/results', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = resultCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const exam = tutorId ? await prisma.exam.findFirst({ where: { id: param(req.params.examId), batch: { tutorId }, deletedAt: null } }) : null;
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    if (parsed.data.marksObtained > exam.totalMarks) return res.status(400).json({ message: 'Marks cannot exceed total marks.' });
    const enrollment = await prisma.enrollment.findFirst({ where: { batchId: exam.batchId, studentId: parsed.data.studentId, deletedAt: null } });
    if (!enrollment) return res.status(400).json({ message: 'Student is not enrolled in the exam batch.' });
    const percentage = resultPercentage(parsed.data.marksObtained, exam.totalMarks);
    try {
      return res.status(201).json(await prisma.examResult.create({ data: { examId: exam.id, studentId: parsed.data.studentId, marksObtained: parsed.data.marksObtained, grade: gradeForPercentage(percentage), remarks: parsed.data.remarks || null } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'Result already exists for this student and exam.' });
      throw error;
    }
  });

  router.patch('/:examId/results/:resultId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = resultUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const result = tutorId ? await prisma.examResult.findFirst({ where: { id: param(req.params.resultId), examId: param(req.params.examId), deletedAt: null, exam: { batch: { tutorId } } }, include: { exam: true } }) : null;
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    if (parsed.data.marksObtained !== undefined && parsed.data.marksObtained > result.exam.totalMarks) return res.status(400).json({ message: 'Marks cannot exceed total marks.' });
    const marks = parsed.data.marksObtained ?? result.marksObtained ?? 0;
    return res.json(await prisma.examResult.update({ where: { id: result.id }, data: { ...(parsed.data.marksObtained !== undefined ? { marksObtained: marks, grade: gradeForPercentage(resultPercentage(marks, result.exam.totalMarks)) } : {}), ...(parsed.data.remarks !== undefined ? { remarks: parsed.data.remarks || null } : {}) } }));
  });

  router.get('/:examId/results', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = resultListSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const exam = tutorId ? await prisma.exam.findFirst({ where: { id: param(req.params.examId), batch: { tutorId }, deletedAt: null } }) : null;
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    const results = await prisma.examResult.findMany({
      where: { examId: exam.id, deletedAt: null, ...(parsed.data.subjectId ? { exam: { syllabus: { some: { subjectId: parsed.data.subjectId, deletedAt: null } } } } : {}) },
      include: { student: { include: { user: { select: { id: true, fullName: true, email: true } } } } },
      orderBy: { marksObtained: 'desc' },
    });
    const marks = results.flatMap((result) => result.marksObtained === null ? [] : [result.marksObtained]);
    return res.json({ results, summary: resultSummary(marks, exam.totalMarks), gradeBands: defaultGradeBands });
  });

  return router;
}

export function createStudentResultRouter() {
  const router = Router();
  router.get('/:studentId/results', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const student = tutorId ? await prisma.student.findFirst({ where: { id: param(req.params.studentId), tutorId, deletedAt: null } }) : null;
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    const history = await prisma.examResult.findMany({ where: { studentId: student.id, deletedAt: null, exam: { batch: { tutorId } } }, include: { exam: { include: { batch: { select: { id: true, name: true } }, syllabus: { where: { deletedAt: null }, include: { subject: { select: { id: true, name: true } } } } } } }, orderBy: { exam: { scheduledAt: 'asc' } } });
    const marks = history.flatMap((result) => result.marksObtained === null ? [] : [result.marksObtained]);
    const subjects = new Map<string, { name: string; marks: number[]; total: number }>();
    for (const result of history) for (const syllabus of result.exam.syllabus) { const entry = subjects.get(syllabus.subject.id) ?? { name: syllabus.subject.name, marks: [], total: result.exam.totalMarks }; if (result.marksObtained !== null) entry.marks.push(result.marksObtained); subjects.set(syllabus.subject.id, entry); }
    return res.json({ student, history, average: resultSummary(marks, history[0]?.exam.totalMarks ?? 0), subjectResults: [...subjects.values()].map((subject) => ({ ...subject, summary: resultSummary(subject.marks, subject.total) })), improvementTrend: history.map((result) => ({ examId: result.examId, percentage: result.marksObtained === null ? null : resultPercentage(result.marksObtained, result.exam.totalMarks) })) });
  });
  return router;
}