/**
 * 患者端慢病摘要纯函数（M39-B）。
 */

export function dueSoon(now: Date, nextFollowupAt: Date): boolean {
  const days = (nextFollowupAt.getTime() - now.getTime()) / 86400000;
  return days <= 7 && days >= 0;
}

export function daysToFollowup(now: Date, nextFollowupAt: Date): number {
  return Math.round((nextFollowupAt.getTime() - now.getTime()) / 86400000);
}

export function summarize(
  plans: { disease: string; nextFollowupAt: string }[],
  vitals: { sbp: number | null; dbp: number | null; fastingGlucose: number | null; hba1c: number | null; measuredAt: string }[],
  now: Date,
) {
  const latest = vitals[0] ?? null;
  const nextPlan = plans[0] ?? null;
  return {
    latestVitals: latest,
    nextFollowupAt: nextPlan?.nextFollowupAt ?? null,
    daysToFollowup: nextPlan ? daysToFollowup(now, new Date(nextPlan.nextFollowupAt)) : null,
    dueSoon: nextPlan ? dueSoon(now, new Date(nextPlan.nextFollowupAt)) : false,
    planCount: plans.length,
    vitalsCount: vitals.length,
  };
}
