# TutionFlow Authentication

## Overview

This Phase 3 implementation introduces the authentication and authorization foundation for the API. It is intentionally limited to the authentication dimensions of the product and does not yet include business modules.

## Supported roles

- ADMIN
- TUTOR

The design is extensible so STUDENT and GUARDIAN can be added later without changing the authorization pattern.

## Authentication flow

- Registration creates a user record with a hashed password.
- Login validates credentials and issues:
  - access token (short-lived)
  - refresh token (long-lived)
- Refresh route rotates refresh tokens by issuing a new pair.
- Protected routes use bearer tokens via `Authorization: Bearer <token>`.
- Role guards restrict sensitive routes.
- The web application validates the current user before rendering protected pages.
- When an access token expires, the web client uses its refresh token once and retries the original request; failed recovery clears the local session and returns the user to sign-in.
- Signing out calls the API and removes the browser session. Account settings provide a validated password-change form.

## Security notes

- Passwords are hashed with `bcryptjs`.
- JWTs are signed using environment-provided secrets.
- Tokens are not logged.
- Authentication endpoints are rate limited.
- Input validation is enforced using Zod.

## Endpoints

- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/refresh`
- GET `/api/auth/me`
- PATCH `/api/auth/me`
- POST `/api/auth/change-password`
- GET `/api/auth/admin-only`

## Future extension

The current authorization setup is designed to accept more roles later, including `STUDENT` and `PARENT`, without weakening the structure of protected route checks.
