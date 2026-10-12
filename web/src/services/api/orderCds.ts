/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS 前端 API（M18-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { EvaluateReq, OrderCdsAlert } from '@/types/orderCds';

const base = '/order-cds';

export function listByVisit(visitId: string) {
  return get<{ alerts: OrderCdsAlert[]; unresolvedHard: number }>(base, { visitId });
}
export function evaluateCds(body: EvaluateReq) {
  return post<{ alerts: OrderCdsAlert[]; overridden: boolean }>(`${base}/evaluate`, body);
}
export function overrideAlert(id: string, reason: string) {
  return post<OrderCdsAlert>(`${base}/${id}/override`, { reason });
}
