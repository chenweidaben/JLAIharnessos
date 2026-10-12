/**
 * 健澜科技 jlmedaios - 结算分析聚合器（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { categoryShares, listAllSummaries } from '../../db/repositories/settlementAnalyticsRepo.js';
import { buildAnalytics, type SummaryPoint } from '../../medical-tools/operations/settlementAnalytics.js';

export class SettlementAnalyticsError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'SettlementAnalyticsError';
  }
}
const forbidden = (m: string) => new SettlementAnalyticsError(403, 'FORBIDDEN', m);

function assertView(auth: AuthView): void {
  if (!auth.permissions.includes('settlement_analytics:view')) throw forbidden('缺少权限：settlement_analytics:view');
}

export async function analyticsView(auth: AuthView, months = 12) {
  assertView(auth);
  const all = await listAllSummaries();
  const sorted = all.slice().sort((a, b) => a.period.localeCompare(b.period)).slice(-months);
  const points: SummaryPoint[] = [];
  for (const s of sorted) {
    const shares = await categoryShares(s.period);
    points.push({
      period: s.period,
      insuranceSettlement: s.insuranceSettlement,
      drgCases: s.drgCases,
      dipCases: s.dipCases,
      drugShare: shares.drugShare,
      materialShare: shares.materialShare,
      examShare: shares.examShare,
    });
  }
  const out = buildAnalytics(points);
  await recordChainAudit({ actorId: auth.id, action: 'settlement.analytics', resourceType: 'settlement_monthly_summary', resourceId: '', result: 'success', riskLevel: 'low', detail: { months } });
  return out;
}
