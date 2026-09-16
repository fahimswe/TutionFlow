import { describe, expect, it } from 'vitest';
import { gradeForPercentage, resultPercentage, resultSummary } from '../src/lib/grading.js';

describe('examination calculations', () => {
  it('calculates percentage and grade', () => {
    expect(resultPercentage(75, 100)).toBe(75);
    expect(gradeForPercentage(80)).toBe('A');
    expect(gradeForPercentage(79.99)).toBe('B');
  });

  it('summarizes no results without invalid values', () => {
    expect(resultSummary([], 100)).toEqual({ count: 0, averageMarks: 0, averagePercentage: 0, highestMark: 0, lowestMark: 0 });
  });

  it('summarizes one result', () => {
    expect(resultSummary([82], 100)).toEqual({ count: 1, averageMarks: 82, averagePercentage: 82, highestMark: 82, lowestMark: 82 });
  });

  it('calculates average, highest, and lowest marks', () => {
    expect(resultSummary([40, 60, 80], 100)).toEqual({ count: 3, averageMarks: 60, averagePercentage: 60, highestMark: 80, lowestMark: 40 });
  });

  it('supports configurable grading bands', () => {
    expect(gradeForPercentage(92, [{ minimumPercentage: 90, grade: 'Distinction' }, { minimumPercentage: 0, grade: 'Pass' }])).toBe('Distinction');
    expect(gradeForPercentage(70, [{ minimumPercentage: 90, grade: 'Distinction' }, { minimumPercentage: 0, grade: 'Pass' }])).toBe('Pass');
  });
});