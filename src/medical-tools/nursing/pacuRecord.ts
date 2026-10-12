/**
 * PACU Aldrete 评分纯函数（M31-B）。
 * 五项各 0-2 分，总分 0-10；>=9 可出室。
 */

export function aldreteTotal(a: number, r: number, c: number, cn: number, sp: number): number {
  return a + r + c + cn + sp;
}

export function readyForDischarge(total: number): boolean {
  return total >= 9;
}

/** 入室超 60 分钟仍未达出室分→苏醒延迟提示。 */
export function delayedRecovery(enteredAt: Date, now: Date, total: number): boolean {
  if (readyForDischarge(total)) return false;
  const mins = (now.getTime() - enteredAt.getTime()) / 60000;
  return mins > 60;
}
