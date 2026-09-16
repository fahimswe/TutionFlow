# TutionFlow Architecture

## Overview

TutionFlow follows a modular, service-oriented architecture to ensure that business logic remains centralized in the backend while the web and mobile clients remain thin and focused on user experience.

## High-level architecture

```text
Web App
  |
  v
REST API
  |
Backend Services
  |
PostgreSQL Database
  ^
  |
Mobile App
```

## Monorepo structure

- `apps/api`: backend service built with Node.js and TypeScript.
- `apps/web`: Next.js frontend for desktop and tablet usage.
- `apps/mobile`: Expo React Native application for Android and iOS.
- `packages/shared`: shared types and validation rules reused by client apps and server.

## Design principles

- Single source of truth for business rules in the API layer.
- Shared contracts via `packages/shared` rather than duplicated logic.
- Strict TypeScript usage across all platforms.
- Database and authentication configuration driven by environment variables.
- Clear module boundaries for batches, students, subjects, attendance, and results.

## Security expectations

- JWT authentication with refresh token rotation
- Secure password hashing using a proven password hashing algorithm
- Role-based access control
- Environment-based secrets management
- Validation on every API boundary

## Engineering standards

- Feature work is broken into phases.
- Database migrations are required for schema changes.
- All critical backend logic should be covered by tests.
- Documentation is maintained as the platform matures.

## Phase 1 status

The foundation has been set up, including project structure, tooling, shared config, and base application shells. No business modules beyond the initial API and app scaffolds are implemented yet.
