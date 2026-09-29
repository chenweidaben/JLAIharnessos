/**
 * 健澜科技 jlmedaios - 收费结算 API 服务（M3-B）
 *
 * 真实 BFF（src/bff/routes/billing.ts），全部读写 PostgreSQL，无 mock。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { get, post } from '../request';
import type {
  GenerateStats,
  OutstandingView,
  QueueResult,
  SettlementDetail,
} from '@/types/billing';

/** 结算单队列（待支付/已支付/部分退费）。 */
export function fetchSettlementQueue(): Promise<QueueResult> {
  return get<QueueResult>('/billing/queue');
}

/** 计费：从挂号/诊查/医嘱/处方生成费用明细（幂等）。 */
export function generateFeeItems(visitId: string): Promise<GenerateStats> {
  return post<GenerateStats>(`/billing/visits/${visitId}/generate`, {});
}

/** 待结算费用查询。 */
export function fetchOutstanding(visitId: string): Promise<OutstandingView> {
  return get<OutstandingView>(`/billing/visits/${visitId}/outstanding`);
}

/** 归集结算单（选定费用 → 未付结算单）。 */
export function createSettlement(payload: {
  visitId: string;
  itemIds: string[];
  paymentMethod?: string;
}): Promise<{ settlement: SettlementDetail['settlement'] }> {
  return post<{ settlement: SettlementDetail['settlement'] }>(
    '/billing/settlements',
    payload,
  );
}

/** 结算单详情（含费用/票据/退费/Saga 日志）。 */
export function fetchSettlementDetail(id: string): Promise<SettlementDetail> {
  return get<SettlementDetail>(`/billing/settlements/${id}`);
}

/** 收款 + 开票（未付 → 已支付）。 */
export function paySettlement(id: string): Promise<unknown> {
  return post(`/billing/settlements/${id}/pay`, {});
}

/** 作废未付结算单（释放费用）。 */
export function voidSettlement(id: string): Promise<unknown> {
  return post(`/billing/settlements/${id}/void`, {});
}

/** 退费（已结算明细 → 退费，Saga 补偿）。 */
export function refundFeeItem(payload: {
  feeItemId: string;
  reason: string;
}): Promise<unknown> {
  return post('/billing/refunds', payload);
}
