/**
 * 健澜科技 jlmedaios - 整改效果回看 API（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { OutcomeReview } from '@/types/improvementOutcome';

const base = '/improvement-outcome';

export function evaluate(taskId: string, body: Record<string, number>) {
  return post<OutcomeReview>(`${base}/evaluate/${taskId}`, body);
}
export function getByTask(taskId: string) {
  return get<OutcomeReview | null>(`${base}/${taskId}`);
}
