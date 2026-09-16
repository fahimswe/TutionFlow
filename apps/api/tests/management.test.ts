import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import prisma from '../src/lib/prisma.js';

const app = createApp();
let accessToken = '';
let batchId = '';
let studentId = '';

describe('Batch, student, and enrollment API', () => {
  beforeAll(async () => {
    await prisma.enrollment.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.student.deleteMany();
    await prisma.tutor.deleteMany();
    await prisma.user.deleteMany({ where: { email: { endsWith: '@phase4.test' } } });

    const auth = await request(app).post('/api/auth/register').send({
      email: 'tutor@phase4.test', password: 'password123', fullName: 'Phase Four Tutor', role: 'TUTOR',
    });
    accessToken = auth.body.accessToken;
  });

  afterAll(async () => {
    await prisma.enrollment.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.student.deleteMany();
    await prisma.tutor.deleteMany();
    await prisma.user.deleteMany({ where: { email: { endsWith: '@phase4.test' } } });
    await prisma.$disconnect();
  });

  it('requires authentication and tutor authorization', async () => {
    expect((await request(app).get('/api/batches')).status).toBe(401);
    expect((await request(app).get('/api/students')).status).toBe(401);
  });

  it('creates, lists, filters, updates, and archives a batch', async () => {
    const created = await request(app).post('/api/batches').set('Authorization', `Bearer ${accessToken}`).send({
      name: 'Science Batch', code: 'SCI-P4', academicYear: '2026-2027', description: 'Phase 4 test batch', status: 'PLANNED',
    });
    expect(created.status).toBe(201);
    batchId = created.body.id;

    const filtered = await request(app).get('/api/batches?search=Science&status=PLANNED').set('Authorization', `Bearer ${accessToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body).toHaveLength(1);

    const updated = await request(app).patch(`/api/batches/${batchId}`).set('Authorization', `Bearer ${accessToken}`).send({ status: 'ACTIVE' });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe('ACTIVE');

    expect((await request(app).post(`/api/batches/${batchId}/archive`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/batches/${batchId}`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(404);
    expect((await request(app).post(`/api/batches/${batchId}/restore`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/batches/${batchId}`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(200);
  });

  it('creates and updates a student before enrollment', async () => {
    const created = await request(app).post('/api/students').set('Authorization', `Bearer ${accessToken}`).send({
      email: 'student@phase4.test', password: 'password123', fullName: 'Phase Four Student', parentName: 'Parent', address: 'Dhaka',
    });
    expect(created.status).toBe(201);
    studentId = created.body.id;

    const listed = await request(app).get('/api/students?search=Phase%20Four').set('Authorization', `Bearer ${accessToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    const updated = await request(app).patch(`/api/students/${studentId}`).set('Authorization', `Bearer ${accessToken}`).send({ address: 'Chattogram' });
    expect(updated.status).toBe(200);
    expect(updated.body.address).toBe('Chattogram');
  });

  it('prevents duplicate enrollment and supports removal', async () => {
    const batch = await request(app).post('/api/batches').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Enrollment Batch', code: 'ENR-P4', academicYear: '2026' });
    batchId = batch.body.id;
    expect((await request(app).post(`/api/batches/${batchId}/students/${studentId}`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(201);
    expect((await request(app).post(`/api/batches/${batchId}/students/${studentId}`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(409);
    expect((await request(app).get(`/api/students/${studentId}/batches`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(200);
    expect((await request(app).delete(`/api/batches/${batchId}/students/${studentId}`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(200);
  });

  it('archives a student and excludes it from active results', async () => {
    expect((await request(app).post(`/api/students/${studentId}/archive`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(200);
    const listed = await request(app).get('/api/students').set('Authorization', `Bearer ${accessToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body.some((student: { id: string }) => student.id === studentId)).toBe(false);
  });
});
