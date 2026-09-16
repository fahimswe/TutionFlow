export type Dashboard = {
  metrics: { activeBatches: number; totalStudents: number; attendance: number; syllabus: { percentage: number }; examAverage: number };
  todayClasses: Array<{ id: string; scheduledAt: string; batch: { name: string }; subject?: { name: string }; topic?: { title: string }; status: string }>;
  upcomingClasses: Dashboard['todayClasses'];
  upcomingExams: Array<{ id: string; title: string; scheduledAt: string; totalMarks: number; batch: { name: string } }>;
  studentsNeedingAttention: Array<{ id: string; name: string; attendance: number; examAverage: number; reasons: string[] }>;
  batches: Array<{ id: string; name: string; status: string; studentCount: number; attendance: number; syllabus: { percentage: number }; exams: { averagePercentage: number } }>;
};

export type User = { id: string; email: string; fullName: string; phone?: string; role: string };
export type Student = { id: string; user: { fullName: string; email: string; phone?: string }; enrollments?: Array<{ batch: { id: string; name: string; code?: string } }> };
export type Batch = { id: string; name: string; code: string; academicYear: string; status: string; _count?: { enrollments: number } };
export type Subject = { id: string; name: string; code: string; description?: string; chapters?: Array<{ id: string; title: string; topics: Array<{ id: string; title: string }> }> };