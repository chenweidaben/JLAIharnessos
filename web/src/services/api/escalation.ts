/**
 * 健澜科技 jlmedaios - 整改升级 API（M22-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { EscalatedTask } from '@/types/escalation';

export function getChain(taskId: string) {
  return get<EscalatedTask[]>(`/improvement-tasks/${taskId}/chain`);
}
