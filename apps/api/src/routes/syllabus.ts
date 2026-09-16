import { Router, Request } from 'express';
import { Prisma, ProgressStatus } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { calculateProgress } from '../lib/progress.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { chapterSchema, progressSchema, reorderSchema, subjectSchema, subjectUpdateSchema, topicSchema } from '../validators/syllabus.js';

const tutorOnly = [requireAuth, requireRole(['TUTOR'])];

function param(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function tutorIdFor(userId: string) {
  const tutor = await prisma.tutor.findFirst({ where: { userId, deletedAt: null } });
  return tutor?.id;
}

function result(completed: number, total: number) {
  return { completedTopics: completed, totalTopics: total, percentage: calculateProgress(completed, total) };
}

async function topicProgress(topicIds: string[], studentId?: string) {
  const total = topicIds.length;
  const completed = studentId
    ? await prisma.studentProgress.count({ where: { topicId: { in: topicIds }, studentId, status: ProgressStatus.COMPLETED, deletedAt: null } })
    : await prisma.studentProgress.count({ where: { topicId: { in: topicIds }, status: ProgressStatus.COMPLETED, deletedAt: null } });
  return result(completed, total);
}

export function createSubjectRouter() {
  const router = Router();

  router.get('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    const subjects = await prisma.subject.findMany({ where: { tutorId, deletedAt: null }, include: { chapters: { where: { deletedAt: null }, include: { topics: { where: { deletedAt: null }, orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } }, batchSubjects: { where: { deletedAt: null }, include: { batch: { select: { id: true, name: true, code: true } } } } }, orderBy: { name: 'asc' } });
    return res.json(subjects);
  });

  router.post('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = subjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    try {
      return res.status(201).json(await prisma.subject.create({ data: { ...parsed.data, description: parsed.data.description || null, tutorId } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'Subject code already exists.' });
      throw error;
    }
  });

  router.get('/:subjectId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const subject = tutorId ? await prisma.subject.findFirst({ where: { id: param(req.params.subjectId), tutorId, deletedAt: null }, include: { chapters: { where: { deletedAt: null }, include: { topics: { where: { deletedAt: null }, orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } } }) : null;
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    return res.json(subject);
  });

  router.patch('/:subjectId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = subjectUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const subject = tutorId ? await prisma.subject.findFirst({ where: { id: param(req.params.subjectId), tutorId, deletedAt: null } }) : null;
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    try {
      return res.json(await prisma.subject.update({ where: { id: subject.id }, data: { ...parsed.data, description: parsed.data.description === '' ? null : parsed.data.description } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'Subject code already exists.' });
      throw error;
    }
  });

  router.post('/:subjectId/archive', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const subject = tutorId ? await prisma.subject.findFirst({ where: { id: param(req.params.subjectId), tutorId, deletedAt: null } }) : null;
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    return res.json(await prisma.subject.update({ where: { id: subject.id }, data: { deletedAt: new Date() } }));
  });

  router.post('/:subjectId/batches/:batchId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const [subject, batch] = await Promise.all([
      tutorId ? prisma.subject.findFirst({ where: { id: param(req.params.subjectId), tutorId, deletedAt: null } }) : null,
      tutorId ? prisma.batch.findFirst({ where: { id: param(req.params.batchId), tutorId, deletedAt: null } }) : null,
    ]);
    if (!subject || !batch) return res.status(404).json({ message: 'Subject or batch not found.' });
    const existing = await prisma.batchSubject.findUnique({ where: { batchId_subjectId: { batchId: batch.id, subjectId: subject.id } } });
    if (existing?.deletedAt) return res.json(await prisma.batchSubject.update({ where: { id: existing.id }, data: { deletedAt: null } }));
    if (existing) return res.status(409).json({ message: 'Subject is already assigned to this batch.' });
    return res.status(201).json(await prisma.batchSubject.create({ data: { batchId: batch.id, subjectId: subject.id } }));
  });

  router.post('/:subjectId/chapters', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = chapterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const subject = tutorId ? await prisma.subject.findFirst({ where: { id: param(req.params.subjectId), tutorId, deletedAt: null } }) : null;
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    const order = parsed.data.order ?? ((await prisma.chapter.aggregate({ where: { subjectId: subject.id, deletedAt: null }, _max: { order: true } }))._max.order ?? 0) + 1;
    return res.status(201).json(await prisma.chapter.create({ data: { subjectId: subject.id, title: parsed.data.title, description: parsed.data.description || null, order } }));
  });

  router.get('/:subjectId/progress', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const subject = tutorId ? await prisma.subject.findFirst({ where: { id: param(req.params.subjectId), tutorId, deletedAt: null }, include: { chapters: { where: { deletedAt: null }, include: { topics: { where: { deletedAt: null }, select: { id: true } } } } } }) : null;
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    return res.json(await topicProgress(subject.chapters.flatMap((chapter) => chapter.topics.map((topic) => topic.id)), studentId));
  });

  return router;
}

export function createChapterRouter() {
  const router = Router();
  router.patch('/:chapterId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = chapterSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const chapter = tutorId ? await prisma.chapter.findFirst({ where: { id: param(req.params.chapterId), deletedAt: null, subject: { tutorId, deletedAt: null } } }) : null;
    if (!chapter) return res.status(404).json({ message: 'Chapter not found.' });
    return res.json(await prisma.chapter.update({ where: { id: chapter.id }, data: { ...parsed.data, description: parsed.data.description === '' ? null : parsed.data.description } }));
  });
  router.post('/:chapterId/topics', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = topicSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const chapter = tutorId ? await prisma.chapter.findFirst({ where: { id: param(req.params.chapterId), deletedAt: null, subject: { tutorId, deletedAt: null } } }) : null;
    if (!chapter) return res.status(404).json({ message: 'Chapter not found.' });
    const order = parsed.data.order ?? ((await prisma.topic.aggregate({ where: { chapterId: chapter.id, deletedAt: null }, _max: { order: true } }))._max.order ?? 0) + 1;
    return res.status(201).json(await prisma.topic.create({ data: { chapterId: chapter.id, title: parsed.data.title, description: parsed.data.description || null, order } }));
  });
  router.get('/:chapterId/progress', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const chapter = tutorId ? await prisma.chapter.findFirst({ where: { id: param(req.params.chapterId), deletedAt: null, subject: { tutorId, deletedAt: null } }, include: { topics: { where: { deletedAt: null }, select: { id: true } } } }) : null;
    if (!chapter) return res.status(404).json({ message: 'Chapter not found.' });
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    return res.json(await topicProgress(chapter.topics.map((topic) => topic.id), studentId));
  });
  return router;
}

export function createTopicRouter() {
  const router = Router();
  router.patch('/:topicId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = topicSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const topic = tutorId ? await prisma.topic.findFirst({ where: { id: param(req.params.topicId), deletedAt: null, chapter: { subject: { tutorId, deletedAt: null } } } }) : null;
    if (!topic) return res.status(404).json({ message: 'Topic not found.' });
    return res.json(await prisma.topic.update({ where: { id: topic.id }, data: { ...parsed.data, description: parsed.data.description === '' ? null : parsed.data.description } }));
  });
  router.post('/:topicId/reorder', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const topic = tutorId ? await prisma.topic.findFirst({ where: { id: param(req.params.topicId), deletedAt: null, chapter: { subject: { tutorId, deletedAt: null } } } }) : null;
    if (!topic) return res.status(404).json({ message: 'Topic not found.' });
    const topics = await prisma.topic.findMany({ where: { chapterId: topic.chapterId, deletedAt: null }, orderBy: { order: 'asc' } });
    const remaining = topics.filter((item) => item.id !== topic.id);
    remaining.splice(Math.min(parsed.data.order - 1, remaining.length), 0, topic);
    await prisma.$transaction([
      prisma.topic.updateMany({ where: { chapterId: topic.chapterId, deletedAt: null }, data: { order: { increment: 10000 } } }),
      ...remaining.map((item, index) => prisma.topic.update({ where: { id: item.id }, data: { order: index + 1 } })),
    ]);
    return res.json(await prisma.topic.findMany({ where: { chapterId: topic.chapterId, deletedAt: null }, orderBy: { order: 'asc' } }));
  });
  router.patch('/:topicId/progress', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const topic = tutorId ? await prisma.topic.findFirst({ where: { id: param(req.params.topicId), deletedAt: null, chapter: { subject: { tutorId, deletedAt: null } } } }) : null;
    if (!topic) return res.status(404).json({ message: 'Topic not found.' });
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    if (!studentId) return res.status(400).json({ message: 'studentId query parameter is required.' });
    const student = await prisma.student.findFirst({ where: { id: studentId, tutorId, deletedAt: null } });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    const progress = await prisma.studentProgress.upsert({ where: { studentId_topicId: { studentId, topicId: topic.id } }, create: { studentId, topicId: topic.id, status: parsed.data.status, completedAt: parsed.data.status === 'COMPLETED' ? new Date() : null }, update: { status: parsed.data.status, completedAt: parsed.data.status === 'COMPLETED' ? new Date() : null, deletedAt: null } });
    return res.json(progress);
  });
  return router;
}

export function createProgressRouter() {
  const router = Router();
  router.get('/batches/:batchId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const batch = tutorId ? await prisma.batch.findFirst({ where: { id: param(req.params.batchId), tutorId, deletedAt: null }, include: { subjects: { where: { deletedAt: null }, include: { subject: { include: { chapters: { where: { deletedAt: null }, include: { topics: { where: { deletedAt: null }, select: { id: true } } } } } } } } } }) : null;
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const topicIds = batch.subjects.flatMap((item) => item.subject.chapters.flatMap((chapter) => chapter.topics.map((topic) => topic.id)));
    return res.json(await topicProgress(topicIds, studentId));
  });
  router.get('/students/:studentId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const student = tutorId ? await prisma.student.findFirst({
      where: { id: param(req.params.studentId), tutorId, deletedAt: null },
      include: {
        enrollments: {
          where: { deletedAt: null },
          include: {
            batch: {
              include: {
                subjects: {
                  where: { deletedAt: null },
                  include: {
                    subject: {
                      include: {
                        chapters: {
                          where: { deletedAt: null },
                          include: { topics: { where: { deletedAt: null }, select: { id: true } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }) : null;
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    const topicIds = student.enrollments.flatMap((enrollment) => enrollment.batch.subjects.flatMap((item) => item.subject.chapters.flatMap((chapter) => chapter.topics.map((topic) => topic.id))));
    return res.json(await topicProgress(topicIds, student.id));
  });
  return router;
}