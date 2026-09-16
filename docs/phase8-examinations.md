# Phase 8: Examination Management

## Exam endpoints

- `POST /api/exams` creates an exam with title, batch, subject, date, duration, total marks, optional syllabus topic IDs, and instructions.
- `GET /api/exams` lists tutor-owned exams.
- `GET /api/exams/:examId` returns exam details, syllabus, results, summary, and grade bands.
- `PATCH /api/exams/:examId` edits exam details or schedule.

## Result endpoints

- `POST /api/exams/:examId/results` records marks for an enrolled student.
- `PATCH /api/exams/:examId/results/:resultId` edits marks or remarks and recalculates the grade.
- `GET /api/exams/:examId/results` lists results with optional `subjectId` filtering and aggregate summary.
- `GET /api/students/:studentId/results` returns exam history, subject results, average, and improvement trend.

Marks greater than the exam total are rejected. Students must be enrolled in the exam batch, and the composite database constraint plus API checks prevent duplicate results.

The default grading bands are A (80+), B (70+), C (60+), D (50+), and F. Grade bands are returned as part of the API response and are isolated in the grading helper so a configurable settings table can replace them later.

Attendance and later modules are outside this phase.