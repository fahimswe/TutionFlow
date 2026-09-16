# TutionFlow Database Design

## Overview

The TutionFlow database is designed around a PostgreSQL relational schema built with Prisma. The model focuses on tutor-led batch management, academic tracking, attendance, examinations, and student progress.

## Core principles

- Every major entity includes creation and update timestamps.
- Soft-delete fields are included where archival is useful.
- Unique constraints prevent duplicate enrollment, attendance, and syllabus assignments.
- Composite indexes support batch and timetable lookups.
- Cascading deletes keep the data model consistent.

## Main entities

- User: stores login identity, account role, and contact information.
- Tutor: teacher profile data linked to a user account.
- Student: learner profile data linked to a user account.
- Batch: a cohort managed by one tutor.
- Subject: academic subject definitions.
- BatchSubject: many-to-many link between a batch and subjects.
- Enrollment: links students to batches.
- Chapter: subject content structure.
- Topic: granular learning unit under a chapter.
- ClassSession: single scheduled learning session.
- Attendance: attendance record per student per session.
- Exam: assessment scheduled for a batch.
- ExamSyllabus: mapping between exams, subjects, and chapters.
- ExamResult: marks and grade per student per exam.
- Notification: administrative or academic notifications.

## Relationship summary

Tutor -> many Batches
Batch -> many Students through Enrollment
Batch -> many Subjects through BatchSubject
Subject -> many Chapters -> many Topics
Batch -> many ClassSession -> many Attendance
Batch -> many Exam -> many ExamResult
Student -> many StudentProgress records -> Topic

## Soft delete strategy

The schema includes `deletedAt` columns on major entities to support archival-friendly retention without immediate destruction. Future application logic can filter `deletedAt IS NULL` in most read queries.

## Suggested future indexing

Current indexes cover the critical access patterns for batch lookups, assignment lookups, attendance, and progress tracking. Additional indexes can be added for reporting later if query patterns demand it.
