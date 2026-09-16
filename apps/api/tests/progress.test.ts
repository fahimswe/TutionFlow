import { describe, expect, it } from 'vitest';
import { calculateProgress } from '../src/lib/progress.js';

describe('calculateProgress', () => {
  it('returns zero when there are no topics', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('returns zero for one incomplete topic', () => {
    expect(calculateProgress(0, 1)).toBe(0);
  });

  it('returns one hundred for one completed topic', () => {
    expect(calculateProgress(1, 1)).toBe(100);
  });

  it('returns one hundred when all topics are complete', () => {
    expect(calculateProgress(8, 8)).toBe(100);
  });

  it('returns the precise percentage for partial progress', () => {
    expect(calculateProgress(1, 3)).toBe(33.33);
    expect(calculateProgress(2, 5)).toBe(40);
  });
});