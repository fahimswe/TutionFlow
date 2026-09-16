import { randomUUID } from 'crypto';
import { Router } from 'express';
import { Prisma, SessionStatus } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { blocksScheduling, durationMinutes, intervalsOverlap } from '../lib/scheduling.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { calendarQuerySchema, sessionCreateSchema, sessionUpdateSchema } from '../validators/routine.js';

const tutorOnly = [requireAuth, requireRole(['TUTOR'])];

function param(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function tutorIdFor(userId: string) {
  const tutor = await prisma.tutor.findFirst({ where: { userId, deletedAt: null } });
  return tutor?.id;
}

async function schedulingContext(tutorId: string, batchId: string, subjectId: string, topicId: string) {
  const [batch, subject, topic, assignment] = await Promise.all([
    prisma.batch.findFirst({ where: { id: batchId, tutorId, deletedAt: null } }),
    prisma.subject.findFirst({ where: { id: subjectId, tutorId, deletedAt: null } }),
    prisma.topic.findFirst({ where: { id: topicId, deletedAt: null, chapter: { subject: { tutorId, deletedAt: null } } }, include: { chapter: { select: { subjectId: true } } } }),
    prisma.batchSubject.findUnique({ where: { batchId_subjectId: { batchId, subjectId } } }),
  ]);
  if (!batch || !subject || !topic || !assignment || assignment.deletedAt) return null;
  if (topic.chapter.subjectId !== subject.id) return null;
  return { batch, subject, topic };
}

async function conflicts(tutorId: string, start: Date, end: Date, excludedId?: string) {
  const sessions = await prisma.classSession.findMany({
    where: { batch: { tutorId }, deletedAt: null, status: { not: SessionStatus.CANCELLED }, ...(excludedId ? { id: { not: excludedId } } : {}) },
    select: { id: true, scheduledAt: true, durationMin: true, status: true },
  });
  return sessions.find((session) => blocksScheduling(session.status) && intervalsOverlap({ start, end }, { start: session.scheduledAt, end: new Date(session.scheduledAt.getTime() + session.durationMin * 60000) }));
}

const sessionInclude = {
  batch: { select: { id: true, name: true, code: true } },
  subject: { select: { id: true, name: true, code: true } },
  topic: { select: { id: true, title: true, order: true } },
};

export function createRoutineRouter() {
  const router = Router();

  router.get('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return res.status(400).json({ message: 'Invalid date range.' });
    const sessions = await prisma.classSession.findMany({ where: { batch: { tutorId }, deletedAt: null, ...(req.query.batchId && typeof req.query.batchId === 'string' ? { batchId: req.query.batchId } : {}), ...(from || to ? { scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}) }, include: sessionInclude, orderBy: { scheduledAt: 'asc' } });
    return res.json(sessions);
  });

  router.post('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = sessionCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    const { batchId, subjectId, topicId, startAt, endAt, recurrence, title, notes } = parsed.data;
    const context = await schedulingContext(tutorId, batchId, subjectId, topicId);
    if (!context) return res.status(400).json({ message: 'Batch, subject, and topic must belong to the tutor and subject must be assigned to the batch.' });
    const starts = Array.from({ length: recurrence?.occurrences ?? 1 }, (_, index) => new Date(startAt.getTime() + index * 7 * 24 * 60 * 60000));
    const duration = durationMinutes(startAt, endAt);
    for (const start of starts) {
      const end = new Date(start.getTime() + duration * 60000);
      if (await conflicts(tutorId, start, end)) return res.status(409).json({ message: 'Scheduling conflict: the tutor already has a class during this time.', conflictStart: start });
    }
    const recurrenceGroupId = starts.length > 1 ? randomUUID() : null;
    const sessions = await prisma.$transaction(starts.map((start) => prisma.classSession.create({ data: { batchId, subjectId, topicId, title: title || null, scheduledAt: start, durationMin: duration, notes: notes || null, recurrenceGroupId }, include: sessionInclude })));
    return res.status(201).json(starts.length === 1 ? sessions[0] : sessions);
  });

  router.get('/:sessionId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await tutorIdFor(req.user!.id);
    const session = tutorId ? await prisma.classSession.findFirst({ where: { id: param(req.params.sessionId), batch: { tutorId }, deletedAt: null }, include: sessionInclude }) : null;
    if (!session) return res.status(404).json({ message: 'Class session not found.' });
    return res.json(session);
  });

  router.patch('/:sessionId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = sessionUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    const existing = tutorId ? await prisma.classSession.findFirst({ where: { id: param(req.params.sessionId), batch: { tutorId }, deletedAt: null } }) : null;
    if (!existing) return res.status(404).json({ message: 'Class session not found.' });
    const start = parsed.data.startAt ?? existing.scheduledAt;
    const end = parsed.data.endAt ?? new Date(existing.scheduledAt.getTime() + existing.durationMin * 60000);
    if (end <= start) return res.status(400).json({ message: 'End time must be after start time.' });
    if (parsed.data.startAt || parsed.data.endAt) {
      const conflict = await conflicts(tutorId!, start, end, existing.id);
      if (conflict) return res.status(409).json({ message: 'Scheduling conflict: the tutor already has a class during this time.', conflictStart: conflict.scheduledAt });
    }
    return res.json(await prisma.classSession.update({ where: { id: existing.id }, data: { ...(parsed.data.title !== undefined ? { title: parsed.data.title || null } : {}), ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}), ...(parsed.data.startAt ? { scheduledAt: start } : {}), ...(parsed.data.endAt || parsed.data.startAt ? { durationMin: durationMinutes(start, end) } : {}) }, include: sessionInclude }));
  });

  router.post('/:sessionId/complete', ...tutorOnly, async (req: AuthenticatedRequest, res) => updateStatus(req, res, SessionStatus.COMPLETED));
  router.post('/:sessionId/cancel', ...tutorOnly, async (req: AuthenticatedRequest, res) => updateStatus(req, res, SessionStatus.CANCELLED));

  return router;
}

async function updateStatus(req: AuthenticatedRequest, res: Parameters<import('express').RequestHandler>[1], status: SessionStatus) {
  const tutorId = await tutorIdFor(req.user!.id);
  const session = tutorId ? await prisma.classSession.findFirst({ where: { id: param(req.params.sessionId), batch: { tutorId }, deletedAt: null } }) : null;
  if (!session) return res.status(404).json({ message: 'Class session not found.' });
  if (session.status === SessionStatus.CANCELLED && status === SessionStatus.COMPLETED) return res.status(400).json({ message: 'Cancelled classes cannot be completed.' });
  return res.json(await prisma.classSession.update({ where: { id: session.id }, data: { status }, include: sessionInclude }));
}

export function createCalendarRouter() {
  const router = Router();
  router.get('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = calendarQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await tutorIdFor(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    const date = parsed.data.date;
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    if (parsed.data.view === 'month') start.setUTCDate(1);
    if (parsed.data.view === 'week') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    const end = parsed.data.view === 'month' ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) : new Date(start.getTime() + (parsed.data.view === 'day' ? 24 : 7 * 24) * 60 * 60000);
    const sessions = await prisma.classSession.findMany({ where: { batch: { tutorId }, deletedAt: null, scheduledAt: { gte: start, lt: end }, ...(parsed.data.batchId ? { batchId: parsed.data.batchId } : {}) }, include: sessionInclude, orderBy: { scheduledAt: 'asc' } });
    return res.json({ view: parsed.data.view, from: start, to: end, sessions });
  });
  return router;
}