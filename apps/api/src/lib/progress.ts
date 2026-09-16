export function calculateProgress(completedTopics: number, totalTopics: number) {
  if (totalTopics <= 0) return 0;
  return Math.round((completedTopics / totalTopics) * 10000) / 100;
}