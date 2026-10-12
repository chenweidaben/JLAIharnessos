/**
 * 健澜科技 jlmedaios - DRG 预算 API（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { AlertItem, BudgetItem } from '@/types/drgBudget';

const base = '/drg-budgets';

export function listBudgets() {
  return get<BudgetItem[]>(base);
}
export function upsertBudget(body: { groupCode: string; expectedCost: number }) {
  return post<BudgetItem>(base, body);
}
export function listAlerts() {
  return get<AlertItem[]>(`${base}/alerts`);
}
export function ackAlert(id: string) {
  return post<AlertItem>(`${base}/alerts/${id}/ack`, {});
}
