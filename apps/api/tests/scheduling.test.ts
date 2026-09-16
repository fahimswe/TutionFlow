import { describe, expect, it } from 'vitest';
import { blocksScheduling, intervalsOverlap } from '../src/lib/scheduling.js';

const at = (hours: number, minutes = 0, day = 1) => new Date(Date.UTC(2026, 0, day, hours, minutes));
const interval = (startHour: number, endHour: number, day = 1) => ({ start: at(startHour, 0, day), end: at(endHour, 0, day) });

describe('intervalsOverlap', () => {
  it('detects an exact overlap', () => {
    expect(intervalsOverlap(interval(19, 20), interval(19, 20))).toBe(true);
  });

  it('detects partial overlap in either direction', () => {
    expect(intervalsOverlap(interval(19, 20), interval(19, 21))).toBe(true);
    expect(intervalsOverlap(interval(19, 21), interval(20, 22))).toBe(true);
  });

  it('allows adjacent sessions', () => {
    expect(intervalsOverlap(interval(19, 20), interval(20, 21))).toBe(false);
  });

  it('does not overlap sessions on different dates', () => {
    expect(intervalsOverlap(interval(19, 20, 1), interval(19, 20, 2))).toBe(false);
  });

  it('handles containment and minute precision', () => {
    expect(intervalsOverlap({ start: at(19), end: at(22) }, { start: at(20, 30), end: at(20, 45) })).toBe(true);
    expect(intervalsOverlap({ start: at(19), end: at(19, 30) }, { start: at(19, 30), end: at(20) })).toBe(false);
  });

  it('does not let cancelled sessions block scheduling', () => {
    expect(blocksScheduling('CANCELLED')).toBe(false);
    expect(blocksScheduling('SCHEDULED')).toBe(true);
  });
});