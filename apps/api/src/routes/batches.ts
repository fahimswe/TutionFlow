import { Router } from 'express';
import { Prisma, BatchStatus, EnrollmentStatus } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { batchCreateSchema, batchQuerySchema, batchUpdateSchema, studentCreateSchema, studentQuerySchema, studentUpdateSchema } from '../validators/management.js';

const tutorOnly = [requireAuth, requireRole(['TUTOR'])];

async function getTutorId(userId: string) {
  const tutor = await prisma.tutor.findFirst({ where: { userId, deletedAt: null } });
  return tutor?.id;
}

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function createBatchRouter() {
  const router = Router();

  router.get('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = batchQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });

    const tutorId = await getTutorId(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    const { search, status, includeArchived } = parsed.data;
    const batches = await prisma.batch.findMany({
      where: {
        tutorId,
        ...(includeArchived ? {} : { deletedAt: null }),
        ...(status ? { status } : {}),
        ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }, { academicYear: { contains: search } }] } : {}),
      },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(batches);
  });

  router.post('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = batchCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await getTutorId(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    try {
      const batch = await prisma.batch.create({ data: { ...parsed.data, description: parsed.data.description || null, tutorId } });
      return res.status(201).json(batch);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'Batch code already exists.' });
      throw error;
    }
  });

  router.get('/:batchId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
      const batch = tutorId ? await prisma.batch.findFirst({ where: { id: routeParam(req.params.batchId), tutorId, deletedAt: null }, include: { enrollments: { where: { deletedAt: null }, include: { student: { include: { user: { select: { id: true, email: true, fullName: true, phone: true } } } } } } } }) : null;
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    return res.json(batch);
  });

  router.patch('/:batchId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = batchUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await getTutorId(req.user!.id);
    const existing = tutorId ? await prisma.batch.findFirst({ where: { id: routeParam(req.params.batchId), tutorId, deletedAt: null } }) : null;
    if (!existing) return res.status(404).json({ message: 'Batch not found.' });
    try {
      return res.json(await prisma.batch.update({ where: { id: existing.id }, data: { ...parsed.data, description: parsed.data.description === '' ? null : parsed.data.description } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'Batch code already exists.' });
      throw error;
    }
  });

  router.post('/:batchId/archive', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
    const existing = tutorId ? await prisma.batch.findFirst({ where: { id: routeParam(req.params.batchId), tutorId, deletedAt: null } }) : null;
    if (!existing) return res.status(404).json({ message: 'Batch not found.' });
    return res.json(await prisma.batch.update({ where: { id: existing.id }, data: { deletedAt: new Date(), status: BatchStatus.ARCHIVED } }));
  });

  router.post('/:batchId/restore', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
    const existing = tutorId ? await prisma.batch.findFirst({ where: { id: routeParam(req.params.batchId), tutorId, deletedAt: { not: null } } }) : null;
    if (!existing) return res.status(404).json({ message: 'Archived batch not found.' });
    return res.json(await prisma.batch.update({ where: { id: existing.id }, data: { deletedAt: null, status: BatchStatus.PLANNED } }));
  });

  router.get('/:batchId/students', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
    const batch = tutorId ? await prisma.batch.findFirst({ where: { id: routeParam(req.params.batchId), tutorId, deletedAt: null } }) : null;
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    const enrollments = await prisma.enrollment.findMany({ where: { batchId: batch.id, deletedAt: null }, include: { student: { include: { user: { select: { id: true, email: true, fullName: true, phone: true } } } } }, orderBy: { joinedAt: 'desc' } });
    return res.json(enrollments);
  });

  router.post('/:batchId/students/:studentId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
    const [batch, student] = await Promise.all([
      tutorId ? prisma.batch.findFirst({ where: { id: routeParam(req.params.batchId), tutorId, deletedAt: null } }) : null,
        prisma.student.findFirst({ where: { id: routeParam(req.params.studentId), deletedAt: null } }),
    ]);
    if (!batch || !student) return res.status(404).json({ message: 'Batch or student not found.' });
    const existing = await prisma.enrollment.findUnique({ where: { batchId_studentId: { batchId: batch.id, studentId: student.id } } });
    if (existing?.deletedAt || existing?.status === EnrollmentStatus.DROPPED) {
      return res.json(await prisma.enrollment.update({ where: { id: existing.id }, data: { deletedAt: null, status: EnrollmentStatus.ACTIVE, leftAt: null } }));
    }
    if (existing) return res.status(409).json({ message: 'Student is already enrolled in this batch.' });
    return res.status(201).json(await prisma.enrollment.create({ data: { batchId: batch.id, studentId: student.id } }));
  });

  router.delete('/:batchId/students/:studentId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
    const batch = tutorId ? await prisma.batch.findFirst({ where: { id: routeParam(req.params.batchId), tutorId, deletedAt: null } }) : null;
    const enrollment = batch ? await prisma.enrollment.findFirst({ where: { batchId: batch.id, studentId: routeParam(req.params.studentId), deletedAt: null } }) : null;
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found.' });
    return res.json(await prisma.enrollment.update({ where: { id: enrollment.id }, data: { deletedAt: new Date(), leftAt: new Date(), status: EnrollmentStatus.DROPPED } }));
  });

  return router;
}

export function createStudentRouter() {
  const router = Router();

  router.get('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = studentQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await getTutorId(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    const { search, batchId, includeArchived } = parsed.data;
    const students = await prisma.student.findMany({ where: { tutorId, ...(includeArchived ? {} : { deletedAt: null }), ...(batchId ? { enrollments: { some: { batchId, deletedAt: null } } } : {}), ...(search ? { user: { OR: [{ fullName: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }] } } : {}) }, include: { user: { select: { id: true, email: true, fullName: true, phone: true, isActive: true } }, enrollments: { where: { deletedAt: null }, include: { batch: { select: { id: true, name: true, code: true } } } } }, orderBy: { createdAt: 'desc' } });
    return res.json(students);
  });

  router.post('/', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = studentCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await getTutorId(req.user!.id);
    if (!tutorId) return res.status(403).json({ message: 'Tutor profile required.' });
    const { email, password, fullName, phone, parentName, parentPhone, address } = parsed.data;
    try {
      const student = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email, passwordHash: await hashPassword(password), fullName, phone: phone || null, role: 'STUDENT' } });
        return tx.student.create({ data: { tutorId, userId: user.id, parentName: parentName || null, parentPhone: parentPhone || null, address: address || null }, include: { user: { select: { id: true, email: true, fullName: true, phone: true } } } });
      });
      return res.status(201).json(student);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'A user with this email already exists.' });
      throw error;
    }
  });

  router.get('/:studentId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
    const student = tutorId ? await prisma.student.findFirst({ where: { id: routeParam(req.params.studentId), tutorId, deletedAt: null }, include: { user: { select: { id: true, email: true, fullName: true, phone: true, isActive: true, createdAt: true } }, enrollments: { where: { deletedAt: null }, include: { batch: true } } } }) : null;
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    return res.json(student);
  });

  router.patch('/:studentId', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const parsed = studentUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    const tutorId = await getTutorId(req.user!.id);
    const existing = tutorId ? await prisma.student.findFirst({ where: { id: routeParam(req.params.studentId), tutorId, deletedAt: null } }) : null;
    if (!existing) return res.status(404).json({ message: 'Student not found.' });
    const { fullName, phone, parentName, parentPhone, address } = parsed.data;
    return res.json(await prisma.$transaction(async (tx) => {
      if (fullName !== undefined || phone !== undefined) await tx.user.update({ where: { id: existing.userId }, data: { ...(fullName !== undefined ? { fullName } : {}), ...(phone !== undefined ? { phone: phone || null } : {}) } });
      return tx.student.update({ where: { id: existing.id }, data: { ...(parentName !== undefined ? { parentName: parentName || null } : {}), ...(parentPhone !== undefined ? { parentPhone: parentPhone || null } : {}), ...(address !== undefined ? { address: address || null } : {}) }, include: { user: { select: { id: true, email: true, fullName: true, phone: true } } } });
    }));
  });

  router.post('/:studentId/archive', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
    const existing = tutorId ? await prisma.student.findFirst({ where: { id: routeParam(req.params.studentId), tutorId, deletedAt: null } }) : null;
    if (!existing) return res.status(404).json({ message: 'Student not found.' });
    return res.json(await prisma.student.update({ where: { id: existing.id }, data: { deletedAt: new Date() } }));
  });

  router.get('/:studentId/batches', ...tutorOnly, async (req: AuthenticatedRequest, res) => {
    const tutorId = await getTutorId(req.user!.id);
    const student = tutorId ? await prisma.student.findFirst({ where: { id: routeParam(req.params.studentId), tutorId, deletedAt: null } }) : null;
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    return res.json(await prisma.enrollment.findMany({ where: { studentId: student.id, deletedAt: null, batch: { tutorId, deletedAt: null } }, include: { batch: true }, orderBy: { joinedAt: 'desc' } }));
  });

  return router;
}
