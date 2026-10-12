/**
 * 产后访视纯函数（M34-A）。
 */

const THRESHOLDS: Record<number, number> = { 1: 6, 2: 9, 3: 12 };

export function jaundiceElevated(day: number, tcb: number | null): boolean {
  if (tcb == null) return false;
  const limit = THRESHOLDS[day] ?? 12;
  return tcb >= limit;
}

export function breastfeedingAdequacy(score: number): boolean {
  return score >= 2;
}
