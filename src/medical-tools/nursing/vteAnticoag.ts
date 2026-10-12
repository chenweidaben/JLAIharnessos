/**
 * VTE 抗凝疗程纯函数（M46-A）。
 */

export function courseProgress(startIso: string, plannedDays: number, today: Date): number {
  const start = new Date(startIso);
  const elapsed = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (elapsed < 0) return 0;
  if (elapsed >= plannedDays) return 100;
  return Math.round((elapsed / plannedDays) * 100);
}

export function highBleedingRisk(bleedingScore: number): boolean {
  return bleedingScore >= 40;
}

export function isOverdue(startIso: string, plannedDays: number, today: Date): boolean {
  return courseProgress(startIso, plannedDays, today) >= 100;
}
