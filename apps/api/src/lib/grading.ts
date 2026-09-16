export interface GradeBand {
  minimumPercentage: number;
  grade: string;
}

export const defaultGradeBands: GradeBand[] = [
  { minimumPercentage: 80, grade: 'A' },
  { minimumPercentage: 70, grade: 'B' },
  { minimumPercentage: 60, grade: 'C' },
  { minimumPercentage: 50, grade: 'D' },
  { minimumPercentage: 0, grade: 'F' },
];

export function resultPercentage(marksObtained: number, totalMarks: number) {
  return totalMarks <= 0 ? 0 : Math.round((marksObtained / totalMarks) * 10000) / 100;
}

export function gradeForPercentage(percentage: number, bands: GradeBand[] = defaultGradeBands) {
  return [...bands].sort((first, second) => second.minimumPercentage - first.minimumPercentage).find((band) => percentage >= band.minimumPercentage)?.grade ?? 'F';
}

export function resultSummary(marks: number[], totalMarks: number) {
  const total = marks.length;
  const averageMarks = total === 0 ? 0 : marks.reduce((sum, mark) => sum + mark, 0) / total;
  return {
    count: total,
    averageMarks: Math.round(averageMarks * 100) / 100,
    averagePercentage: resultPercentage(averageMarks, totalMarks),
    highestMark: total === 0 ? 0 : Math.max(...marks),
    lowestMark: total === 0 ? 0 : Math.min(...marks),
  };
}