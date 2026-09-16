# Phase 5: Subjects and Syllabus

## Subject endpoints

- `POST /api/subjects` creates a tutor-owned subject.
- `GET /api/subjects` lists active subjects with chapters and topics.
- `GET /api/subjects/:subjectId` returns the syllabus tree.
- `PATCH /api/subjects/:subjectId` edits a subject.
- `POST /api/subjects/:subjectId/archive` archives a subject.
- `POST /api/subjects/:subjectId/batches/:batchId` assigns a subject to a tutor-owned batch.
- `POST /api/subjects/:subjectId/chapters` creates a chapter.
- `GET /api/subjects/:subjectId/progress` returns subject progress, optionally for `studentId`.

## Chapter and topic endpoints

- `PATCH /api/chapters/:chapterId` edits a chapter.
- `POST /api/chapters/:chapterId/topics` creates a topic.
- `GET /api/chapters/:chapterId/progress` returns chapter progress, optionally for `studentId`.
- `PATCH /api/topics/:topicId` edits a topic.
- `POST /api/topics/:topicId/reorder` changes topic ordering within its chapter.
- `PATCH /api/topics/:topicId/progress?studentId=:studentId` marks a student's topic status.

## Progress endpoints

- `GET /api/progress/batches/:batchId` calculates batch progress, optionally for `studentId`.
- `GET /api/progress/students/:studentId` calculates the student's progress across active enrollments.

Progress is calculated as `completed topics / total topics * 100`, rounded to two decimal places. A syllabus with no topics reports `0%`. Topic statuses are `NOT_STARTED`, `IN_PROGRESS`, and `COMPLETED`; status updates use an upsert so each student has at most one current record per topic.

All endpoints require a tutor bearer token and enforce ownership. Later routine, attendance, and exam work is outside this phase.