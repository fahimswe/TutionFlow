export type Dashboard = {
  metrics: {
    activeBatches: number;
    totalStudents: number;
    attendance: number;
    syllabus: { percentage: number };
    examAverage: number;
  };
  todayClasses: ClassSession[];
  upcomingClasses: ClassSession[];
  upcomingExams: Exam[];
  studentsNeedingAttention: Array<{
    id: string;
    name: string;
    attendance: number;
    examAverage: number;
    reasons: string[];
  }>;
  batches: Array<Batch & {
    studentCount: number;
    attendance: number;
    syllabus: { percentage: number };
    exams: { averagePercentage: number };
  }>;
};

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
};

export type Student = {
  id: string;
  user: { fullName: string; email: string; phone?: string | null };
  enrollments: Array<{ batch: { id: string; name: string; code?: string } }>;
};

export type Batch = {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  status: string;
  _count?: { enrollments: number };
};

export type ClassSession = {
  id: string;
  title?: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  batch: { id: string; name: string; code?: string };
  subject: { id: string; name: string; code?: string };
  topic?: { id: string; title: string } | null;
};

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type AttendanceRecord = {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  remarks?: string | null;
  student: { user: { fullName: string; email: string } };
};

export type Exam = {
  id: string;
  title: string;
  scheduledAt: string;
  totalMarks: number;
  durationMin: number;
  batchId: string;
  batch: { id: string; name: string; code?: string };
  results: ExamResult[];
};

export type ExamResult = {
  id: string;
  studentId: string;
  marksObtained: number | null;
  grade: string | null;
  remarks?: string | null;
  student: { user: { fullName: string; email: string } };
};

export type Enrollment = {
  id: string;
  studentId: string;
  student: {
    id: string;
    user: { fullName: string; email: string; phone?: string | null };
  };
};

export type Subject = {
  id: string;
  name: string;
  code: string;
  description?: string;
  chapters?: Array<{ id: string; title: string; topics: Array<{ id: string; title: string }> }>;
};
