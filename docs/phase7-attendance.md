# Phase 7: Attendance Management

## Endpoints

- `POST /api/attendance/sessions/:sessionId` takes attendance for enrolled students with `{ records: [{ studentId, status, remarks }] }`.
- `GET /api/attendance/sessions/:sessionId` returns class attendance and totals.
- `PATCH /api/attendance/:attendanceId` edits an attendance record.
- `GET /api/attendance/students/:studentId` returns attendance history with optional `from` and `to` filters.
- `GET /api/attendance/batches/:batchId` returns batch totals, percentage, per-student percentages, and optional monthly statistics using `month=YYYY-MM`.

Valid statuses are `PRESENT`, `ABSENT`, `LATE`, and `EXCUSED`. Attendance can only be recorded for students actively enrolled in the class session's batch. The composite database constraint and request checks prevent duplicate records for one student and session.

Attendance percentage is calculated as `(PRESENT + LATE) / (PRESENT + LATE + ABSENT) * 100`, rounded to two decimal places. `EXCUSED` marks are excluded from the denominator. With no eligible marks, the percentage is `0`.

All routes require a tutor bearer token and enforce tutor ownership through the actual class session, batch, and student relations. Exams and other later modules are outside this phase.