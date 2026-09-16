# TutionFlow ERD Overview

```text
User 1---1 Tutor
User 1---1 Student
Tutor 1---* Batch
Batch 1---* BatchSubject *---1 Subject
Batch 1---* Enrollment *---1 Student
Subject 1---* Chapter 1---* Topic
Batch 1---* ClassSession 1---* Attendance *---1 Student
Batch 1---* Exam 1---* ExamSyllabus *---1 Subject
Exam 1---* ExamResult *---1 Student
Student 1---* StudentProgress *---1 Topic
User 1---* Notification
Tutor 1---* Notification
Batch 1---* Notification
Student 1---* Notification
```

This diagram captures the essential relational structure used for batch management, academic delivery, class records, assessment tracking, and notifications.
