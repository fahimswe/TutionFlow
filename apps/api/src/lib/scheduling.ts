export interface TimeInterval {
  start: Date;
  end: Date;
}

export function intervalsOverlap(first: TimeInterval, second: TimeInterval) {
  return first.start < second.end && second.start < first.end;
}

export function durationMinutes(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function blocksScheduling(status: string) {
  return status !== 'CANCELLED';
}