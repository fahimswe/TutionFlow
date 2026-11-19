# TutionFlow

TutionFlow is a production-focused tuition management platform designed for tutors managing multiple batches, subjects, students, attendance, exams, results, and academic progress.

## Project status

This repository contains the product foundation and an Android-focused tutor mobile MVP.

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

### Run the Android app locally

The mobile app targets Expo SDK 58 and is compatible with the matching Expo Go
release. Update Expo Go to SDK 58 before scanning the development QR code.

Start the API from the repository root in one terminal:

```bash
npm run dev --workspace=@tutionflow/api
```

In another terminal, start Expo:

```bash
npm run start --workspace=@tutionflow/mobile
```

Use an Android emulator with Expo Go, or press `a` in the Expo terminal when an
emulator is running. The app uses `http://10.0.2.2:4000` for the API on the
Android emulator. For a physical device, copy `apps/mobile/.env.example` to
`apps/mobile/.env`, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, and
ensure the phone and computer are on the same network with port 4000 reachable.
The API must be running, and a tutor account can be created from the app's sign
in screen.

The initial mobile workflows include the tutor dashboard, class schedule,
student and batch lists, attendance taking, and exam result entry.

### Current scope

The mobile app currently covers tutor sign-in and registration, dashboard, class schedule, student and batch lists, attendance taking, and exam result entry. The web and API workspaces also contain the broader project foundation; some product workflows still need further implementation before a full production launch.
