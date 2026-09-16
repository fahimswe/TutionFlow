# TutionFlow

TutionFlow is a production-focused tuition management platform designed for tutors managing multiple batches, subjects, students, attendance, exams, results, and academic progress.

## Phase 1: Architecture & Project Foundation

This repository currently implements the foundation for the product architecture and workspace layout.

### Included in Phase 1

- Monorepo workspace structure for web, mobile, backend, and shared packages
- Shared TypeScript configuration and package conventions
- Backend API skeleton with environment validation and health endpoint
- Next.js web app shell
- Expo mobile app shell
- Shared package for cross-platform contracts
- Architecture and system documentation

### Workspace structure

- `apps/api` — backend REST API service
- `apps/web` — Next.js web application
- `apps/mobile` — Expo React Native application
- `packages/shared` — shared types and cross-platform utilities
- `docs/architecture.md` — platform, architecture, and engineering decisions

### Getting started

```bash
npm install
npm run typecheck
npm test
```

### Roadmap

This project intentionally stops at Phase 1. Subsequent phases will be implemented only when explicitly requested.
