import { describe, expect, it } from 'vitest';
import { attendancePercentage, emptyAttendanceCounts } from '../src/lib/attendance.js';

describe('attendancePercentage', () => {
  it('returns zero when there are no eligible attendance marks', () => {
    expect(attendancePercentage(emptyAttendanceCounts())).toBe(0);
  });

  it('counts late attendance as attended', () => {
    expect(attendancePercentage({ PRESENT: 1, ABSENT: 1, LATE: 1, EXCUSED: 0 })).toBe(66.67);
  });

  it('excludes excused marks from the denominator', () => {
    expect(attendancePercentage({ PRESENT: 1, ABSENT: 1, LATE: 0, EXCUSED: 4 })).toBe(50);
  });

  it('returns one hundred for all attended marks', () => {
    expect(attendancePercentage({ PRESENT: 3, ABSENT: 0, LATE: 2, EXCUSED: 1 })).toBe(100);
  });
});