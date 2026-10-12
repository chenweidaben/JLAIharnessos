/**
 * 体检中心纯函数（M40-A）。
 */

export function progress(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function allItemsCompleted(items: { completed: boolean }[]): boolean {
  if (items.length === 0) return false;
  return items.every(i => i.completed);
}

export function reportReady(status: string): boolean {
  return status === 'completed' || status === 'reported';
}
