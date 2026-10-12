/**
 * 急诊绿色通道超时催办纯函数（M37-A）。
 */

export function timeoutMinutes(level: string): number {
  return level === 'I' ? 10 : 30;
}

export function isOverdue(level: string, triagedAt: Date, now: Date): boolean {
  const minutes = (now.getTime() - triagedAt.getTime()) / 60000;
  return minutes > timeoutMinutes(level);
}

export function erGreenTaskTitle(level: string): string {
  return `ER-${level} green channel overdue >${timeoutMinutes(level)}min`;
}

export function erGreenTaskFinding(level: string, minutes: number): string {
  return `ER level=${level} triaged, elapsed=${Math.round(minutes)}min exceeds SLA=${timeoutMinutes(level)}min`;
}
