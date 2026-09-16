import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import prisma from '../src/lib/prisma.js';

const app = createApp();

describe('Authentication API', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('registers a new tutor', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'tutor@example.com',
        password: 'password123',
        fullName: 'Tutor User',
        phone: '+123456789',
        role: 'TUTOR',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('rejects duplicate registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'tutor@example.com',
        password: 'password123',
        fullName: 'Tutor User',
        role: 'TUTOR',
      });

    expect(response.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tutor@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('rejects wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tutor@example.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
  });

  it('returns current user profile for authenticated user', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tutor@example.com', password: 'password123' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('tutor@example.com');
  });

  it('rejects invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });

  it('refreshes access tokens', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tutor@example.com', password: 'password123' });

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('blocks unauthorized access', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('allows admin-only route for admin user', async () => {
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'password123',
        fullName: 'Admin User',
        role: 'ADMIN',
      });

    const response = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${adminResponse.body.accessToken}`);

    expect(response.status).toBe(200);
  });

  it('denies non-admin access', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tutor@example.com', password: 'password123' });

    const response = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('updates profile', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tutor@example.com', password: 'password123' });

    const response = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({ fullName: 'Updated Tutor' });

    expect(response.status).toBe(200);
    expect(response.body.fullName).toBe('Updated Tutor');
  });

  it('changes password', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tutor@example.com', password: 'password123' });

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newPassword123' });

    expect(response.status).toBe(200);
  });
});
