import { PrismaClient, UserRole, BatchStatus, EnrollmentStatus, AttendanceStatus, SessionStatus, ExamType, NotificationType, ProgressStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.studentProgress.deleteMany();
  await prisma.examResult.deleteMany();
  await prisma.examSyllabus.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.batchSubject.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.student.deleteMany();
  await prisma.tutor.deleteMany();
  await prisma.user.deleteMany();

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@tutionflow.dev',
      passwordHash: '$2b$10$P0rK8rXQwM3f7qKqX8w8xO3JjNStyZ5A0p0t3fM5mVgC1F0N1JRL2',
      fullName: 'System Admin',
      role: UserRole.ADMIN,
      phone: '+8801700000000',
    },
  });

  const tutorUser = await prisma.user.create({
    data: {
      email: 'tutor@tutionflow.dev',
      passwordHash: '$2b$10$P0rK8rXQwM3f7qKqX8w8xO3JjNStyZ5A0p0t3fM5mVgC1F0N1JRL2',
      fullName: 'Nadia Rahman',
      role: UserRole.TUTOR,
      phone: '+8801712345678',
    },
  });

  const tutor = await prisma.tutor.create({
    data: {
      userId: tutorUser.id,
      qualification: 'MSc Mathematics',
      bio: 'Experienced coaching specialist for HSC and college preparation.',
    },
  });

  const biologySubject = await prisma.subject.create({
    data: {
      tutorId: tutor.id,
      name: 'Biology',
      code: 'BIO-101',
      description: 'Human biology, genetics, and ecology.',
    },
  });

  const mathSubject = await prisma.subject.create({
    data: {
      tutorId: tutor.id,
      name: 'Mathematics',
      code: 'MATH-201',
      description: 'Core algebra and calculus classes.',
    },
  });

  const batch = await prisma.batch.create({
    data: {
      tutorId: tutor.id,
      name: 'HSC Science Batch A',
      code: 'HSC-SCI-A',
      academicYear: '2026',
      status: BatchStatus.ACTIVE,
      startDate: new Date('2026-01-15T00:00:00Z'),
      endDate: new Date('2026-12-31T00:00:00Z'),
    },
  });

  await prisma.batchSubject.createMany({
    data: [
      { batchId: batch.id, subjectId: biologySubject.id },
      { batchId: batch.id, subjectId: mathSubject.id },
    ],
  });

  const student1User = await prisma.user.create({
    data: {
      email: 'student1@tutionflow.dev',
      passwordHash: '$2b$10$P0rK8rXQwM3f7qKqX8w8xO3JjNStyZ5A0p0t3fM5mVgC1F0N1JRL2',
      fullName: 'Aisha Karim',
      role: UserRole.STUDENT,
      phone: '+8801812345678',
    },
  });

  const student2User = await prisma.user.create({
    data: {
      email: 'student2@tutionflow.dev',
      passwordHash: '$2b$10$P0rK8rXQwM3f7qKqX8w8xO3JjNStyZ5A0p0t3fM5mVgC1F0N1JRL2',
      fullName: 'Rahim Hassan',
      role: UserRole.STUDENT,
      phone: '+8801912345678',
    },
  });

  const student1 = await prisma.student.create({
    data: {
      tutorId: tutor.id,
      userId: student1User.id,
      parentName: 'Karim Uddin',
      parentPhone: '+8801711111111',
      address: 'Dhaka',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      tutorId: tutor.id,
      userId: student2User.id,
      parentName: 'Hassan Ali',
      parentPhone: '+8801722222222',
      address: 'Chattogram',
    },
  });

  await prisma.enrollment.createMany({
    data: [
      { batchId: batch.id, studentId: student1.id, status: EnrollmentStatus.ACTIVE },
      { batchId: batch.id, studentId: student2.id, status: EnrollmentStatus.ACTIVE },
    ],
  });

  const chapter1 = await prisma.chapter.create({
    data: {
      subjectId: biologySubject.id,
      title: 'Cell Structure',
      order: 1,
      description: 'Basic cell structure and functions',
    },
  });

  const chapter2 = await prisma.chapter.create({
    data: {
      subjectId: mathSubject.id,
      title: 'Quadratic Equations',
      order: 1,
      description: 'Foundations of quadratic equations',
    },
  });

  const topic1 = await prisma.topic.create({
    data: {
      chapterId: chapter1.id,
      title: 'Cell Organelles',
      order: 1,
      description: 'Compare organelle functions and roles',
    },
  });

  const topic2 = await prisma.topic.create({
    data: {
      chapterId: chapter2.id,
      title: 'Solving by Factorization',
      order: 1,
      description: 'Factorization technique and roots',
    },
  });

  const session = await prisma.classSession.create({
    data: {
      batchId: batch.id,
      subjectId: biologySubject.id,
      topicId: topic1.id,
      title: 'Weekly live class',
      scheduledAt: new Date('2026-08-30T16:00:00Z'),
      durationMin: 90,
      status: SessionStatus.SCHEDULED,
    },
  });

  await prisma.attendance.createMany({
    data: [
      { classSessionId: session.id, studentId: student1.id, status: AttendanceStatus.PRESENT },
      { classSessionId: session.id, studentId: student2.id, status: AttendanceStatus.LATE },
    ],
  });

  const exam = await prisma.exam.create({
    data: {
      batchId: batch.id,
      title: 'Unit Test 1',
      type: ExamType.UNIT_TEST,
      scheduledAt: new Date('2026-09-10T10:00:00Z'),
      totalMarks: 100,
      passingMarks: 40,
    },
  });

  await prisma.examSyllabus.createMany({
    data: [
      { examId: exam.id, subjectId: biologySubject.id, chapterId: chapter1.id },
      { examId: exam.id, subjectId: mathSubject.id, chapterId: chapter2.id },
    ],
  });

  await prisma.examResult.createMany({
    data: [
      { examId: exam.id, studentId: student1.id, marksObtained: 88, grade: 'A' },
      { examId: exam.id, studentId: student2.id, marksObtained: 65, grade: 'B' },
    ],
  });

  await prisma.studentProgress.createMany({
    data: [
      { studentId: student1.id, topicId: topic1.id, status: ProgressStatus.COMPLETED },
      { studentId: student1.id, topicId: topic2.id, status: ProgressStatus.IN_PROGRESS },
      { studentId: student2.id, topicId: topic1.id, status: ProgressStatus.IN_PROGRESS },
      { studentId: student2.id, topicId: topic2.id, status: ProgressStatus.NOT_STARTED },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        title: 'Welcome',
        message: 'Welcome to TutionFlow admin dashboard.',
        type: NotificationType.SYSTEM,
      },
      {
        tutorId: tutor.id,
        title: 'Class reminder',
        message: 'Your next session is scheduled tomorrow at 4:00 PM.',
        type: NotificationType.INFO,
      },
      {
        batchId: batch.id,
        title: 'Exam scheduled',
        message: 'Unit Test 1 has been scheduled for next Saturday.',
        type: NotificationType.EXAM,
      },
    ],
  });

  console.log('Seed data created successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
