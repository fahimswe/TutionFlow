# Phase 6: Routine and Calendar

## Session endpoints

- `POST /api/sessions` creates a class session. It requires `batchId`, `subjectId`, `topicId`, `startAt`, and `endAt`; title and notes are optional.
- `GET /api/sessions` lists tutor sessions with optional `from`, `to`, and `batchId` filters.
- `GET /api/sessions/:sessionId` returns session details.
- `PATCH /api/sessions/:sessionId` edits or reschedules a session.
- `POST /api/sessions/:sessionId/complete` marks a session completed.
- `POST /api/sessions/:sessionId/cancel` cancels a session.

Creation supports weekly recurrence with `{ "recurrence": { "frequency": "WEEKLY", "occurrences": 2 } }`. Each generated session is checked for conflicts before creation.

## Calendar endpoint

`GET /api/calendar?view=day|week|month&date=2026-08-26` returns the requested UTC calendar window. Optional `batchId` filtering is supported. Each session includes batch, subject, topic, start time, end time through `durationMin`, and status.

## Conflict rules

Conflicts are checked across all non-cancelled sessions belonging to the tutor. Intervals use half-open boundaries, so `19:00-20:00` and `20:00-21:00` are valid adjacent sessions. Exact overlaps, partial overlaps, and containment return HTTP `409` with a clear conflict message. Cancelled sessions do not block scheduling.

Attendance is intentionally outside this phase.