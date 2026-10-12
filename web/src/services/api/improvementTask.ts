/**
 * 健澜科技 jlmedaios - 改进任务 API（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { ImprovementTask } from '@/types/improvementTask';

const base = '/improvement-tasks';

export function listMine() {
  return get<ImprovementTask[]>(`${base}/mine`);
}
export function listAll() {
  return get<ImprovementTask[]>(base);
}
export function createFromAttribution(body: { title: string; finding: string; assigneeId: string; category?: string }) {
  return post<ImprovementTask>(`${base}/from-attribution`, body);
}
export function transition(id: string, body: { to: string; resolutionNote?: string }) {
  return post<ImprovementTask>(`${base}/${id}/transition`, body);
}
