/**
 * 健澜科技 jlmedaios - 药事看板 API（M77-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { DashboardRow, SubmitInput } from '@/types/amDashboard';

const base = '/am-dash';

export function submitAmMetric(input: SubmitInput) {
  return post(base, input);
}
export function listAmDash(month: string) {
  return get<DashboardRow[]>(base, { month });
}
