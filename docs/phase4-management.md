# Phase 4: Batch and Student Management

## Batch endpoints

- `POST /api/batches` creates a batch.
- `GET /api/batches` lists active batches and supports `search`, `status`, and `includeArchived`.
- `GET /api/batches/:batchId` returns batch details and active enrollments.
- `PATCH /api/batches/:batchId` edits a batch.
- `POST /api/batches/:batchId/archive` archives a batch.
- `GET /api/batches/:batchId/students` lists the batch students.

Batch records include name, unique code, academic year, description, status, start date, and end date.

## Student endpoints

- `POST /api/students` adds a student account and profile.
- `GET /api/students` lists the tutor's students and supports `search`, `batchId`, and `includeArchived`.
- `GET /api/students/:studentId` returns a student profile and active batches.
- `PATCH /api/students/:studentId` edits profile details.
- `POST /api/students/:studentId/archive` archives the student.
- `GET /api/students/:studentId/batches` lists the student's active batches.

## Enrollment endpoints

- `POST /api/batches/:batchId/students/:studentId` enrolls a student.
- `DELETE /api/batches/:batchId/students/:studentId` removes the student by soft-dropping the enrollment.

Duplicate active enrollments return `409`. A removed enrollment is restored when the same student is added to the same batch again. All management routes require a valid tutor bearer token and enforce tutor ownership.

Syllabus, routine, attendance, and exam modules are intentionally outside this phase.