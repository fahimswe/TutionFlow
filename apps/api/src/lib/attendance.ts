export type AttendanceMark = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export function attendancePercentage(counts: Record<AttendanceMark, number>) {
  const attended = counts.PRESENT + counts.LATE;
  const eligible = attended + counts.ABSENT;
  return eligible === 0 ? 0 : Math.round((attended / eligible) * 10000) / 100;
}

export function emptyAttendanceCounts(): Record<AttendanceMark, number> {
  return { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
}