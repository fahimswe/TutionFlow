# Phase 9: Dashboard and Analytics

## Dashboard endpoints

- `GET /api/dashboard` returns today's classes, upcoming classes and exams, active batch and student counts, attendance, syllabus progress, exam average, students needing attention, and batch health.
- `GET /api/dashboard/students/:studentId` returns attendance, syllabus progress, exam performance, recent results, and performance trend for one student.
- `GET /api/dashboard/batches/:batchId` returns student count, attendance, syllabus completion, average exam score, upcoming classes, and upcoming exams for one batch.

All endpoints require an authenticated tutor and scope every aggregate to that tutor's records.

## Actionable signals

Students needing attention are surfaced when attendance falls below 75% or exam average falls below 60%. The dashboard emphasizes today's agenda and the attention queue before broader batch health summaries.

## Web dashboard

The Next.js home page is the tutor dashboard. It uses a responsive operational layout with a KPI strip, class agenda, upcoming work, attention queue, and compact batch health table. It loads live data from `NEXT_PUBLIC_API_URL` when a `tutionflow_access_token` is available and shows clearly labeled preview data when the API is unavailable.

No additional charting dependency was introduced. Progress bars and small summary tables are used where they communicate the requested information more directly.

Later phases are intentionally outside this implementation.