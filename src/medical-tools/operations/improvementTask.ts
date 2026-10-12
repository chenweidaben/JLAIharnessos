/**
 * 健澜科技 jlmedaios - 临床改进任务状态机纯函数（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type TaskStatus = 'open' | 'accepted' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'rejected';

const NEXT: Record<TaskStatus, TaskStatus[]> = {
  open: ['accepted', 'in_progress', 'rejected'],
  accepted: ['in_progress', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: ['verified', 'in_progress'],
  verified: ['closed'],
  closed: [],
  rejected: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return NEXT[from]?.includes(to) ?? false;
}

export function isOverdue(dueDate: string | null, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < now.getTime();
}
