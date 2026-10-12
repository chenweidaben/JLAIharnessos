/**
 * ICU 镇静异常工单纯函数（M33-B）。
 */

export function needsAdjustment(rass: number): boolean {
  return rass <= -3 || rass >= 2;
}

export function sedationTaskTitle(rass: number): string {
  if (rass <= -3) return `镇静过深 RASS=${rass}`;
  return `镇静不足/躁动 RASS=${rass}`;
}

export function sedationTaskFinding(rass: number): string {
  if (rass <= -3) return `RASS=${rass} (<=-3) over-sedated, consider dose reduction`;
  return `RASS=${rass} (>=2) agitated, consider dose increase`;
}
