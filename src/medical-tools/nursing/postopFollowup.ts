/**
 * 术后镇痛随访纯函数（M31-C）。
 */

export type Timepoint = '6h' | '24h' | '48h';

const HOURS: Record<Timepoint, number> = { '6h': 6, '24h': 24, '48h': 48 };

export function buildSchedule(surgeryEndAt: Date): { timepoint: Timepoint; dueAt: Date }[] {
  return (['6h','24h','48h'] as Timepoint[]).map((tp) => ({
    timepoint: tp,
    dueAt: new Date(surgeryEndAt.getTime() + HOURS[tp] * 3600000),
  }));
}

export function isOverdue(dueAt: Date, now: Date): boolean {
  return now.getTime() > dueAt.getTime();
}

export function shouldEscalate(score: number): boolean {
  return score >= 4;
}
