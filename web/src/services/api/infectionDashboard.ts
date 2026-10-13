/**
 * 健澜科技 jlmedaios - 院感看板 API（M76-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { DashboardRow, SubmitInput } from '@/types/infectionDashboard';

const base = '/infection-dash';

export function submitInfectionMetric(input: SubmitInput) {
  return post(base, input);
}
export function listInfectionDash(month: string) {
  return get<DashboardRow[]>(base, { month });
}
