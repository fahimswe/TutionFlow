import { Router } from 'express';

export function createHealthRouter() {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'tutionflow-api',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
