import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { createAuthRouter } from './routes/auth.js';
import { createBatchRouter, createStudentRouter } from './routes/batches.js';
import { createHealthRouter } from './routes/health.js';
import { createCalendarRouter, createRoutineRouter } from './routes/routine.js';
import { createAttendanceRouter } from './routes/attendance.js';
import { createExamRouter, createStudentResultRouter } from './routes/exams.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createChapterRouter, createProgressRouter, createSubjectRouter, createTopicRouter } from './routes/syllabus.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use('/api', createHealthRouter());
  app.use('/api/auth', createAuthRouter());
  app.use('/api/batches', createBatchRouter());
  app.use('/api/students', createStudentRouter());
  app.use('/api/subjects', createSubjectRouter());
  app.use('/api/chapters', createChapterRouter());
  app.use('/api/topics', createTopicRouter());
  app.use('/api/progress', createProgressRouter());
  app.use('/api/sessions', createRoutineRouter());
  app.use('/api/calendar', createCalendarRouter());
  app.use('/api/attendance', createAttendanceRouter());
  app.use('/api/exams', createExamRouter());
  app.use('/api/students', createStudentResultRouter());
  app.use('/api/dashboard', createDashboardRouter());

  return app;
}
