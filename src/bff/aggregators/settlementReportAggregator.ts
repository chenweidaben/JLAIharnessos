/**
 * 健澜科技 jlmedaios - 月度结算报表聚合器（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  getSummary,
  listSummaries,
  upsertSummary,
} from '../../db/repositories/settlementReportRepo.js';
import { listSelections } from '../../db/repositories/paymentSelectionRepo.js';
import { getMonthlyPoint } from '../../db/repositories/dipRepo.js';
import { aggregateSummary, toCsv, type CaseRow } from '../../medical-tools/operations/settlementReport.js';

export class SettlementReportError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'SettlementReportError';
  }
}
const badRequest = (m: string) => new SettlementReportError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new SettlementReportError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new SettlementReportError(403, 'FORBIDDEN', m);

function assertView(auth: AuthView): void {
  if (!auth.permissions.includes('settlement_report:view')) throw forbidden('缺少权限：settlement_report:view');
}

export async function computeView(auth: AuthView, period: string) {
  assertView(auth);
  if (!/^[0-9]{4}-[0-9]{2}$/.test(period)) throw badRequest('period 格式应为 YYYY-MM');
  const mp = await getMonthlyPoint(period);
  const pointValue = mp?.pointValue ?? 0;
  const all = await listSelections();
  const cases: CaseRow[] = all.map((s) => ({
    selectedPath: s.selectedPath,
    drgPayment: s.drgExpectedPayment ?? 0,
    dipPayment: s.dipPayment ?? 0,
    outOfPocket: 0,
    dipScore: s.dipScore ?? 0,
  }));
  const agg = aggregateSummary(cases, pointValue);
  const r = await upsertSummary({ period, drgCases: agg.drgCases, dipCases: agg.dipCases, totalScore: agg.totalScore, insuranceSettlement: agg.insuranceSettlement, patientOutOfPocket: agg.outOfPocket, pointValue });
  await recordChainAudit({ actorId: auth.id, action: 'settlement.compute', resourceType: 'settlement_monthly_summary', resourceId: r.id, result: 'success', riskLevel: 'low', detail: { period } });
  return r;
}

export async function getView(auth: AuthView, period: string) {
  assertView(auth);
  if (!/^[0-9]{4}-[0-9]{2}$/.test(period)) throw badRequest('period 格式应为 YYYY-MM');
  const r = await getSummary(period);
  if (!r) throw notFound('该月汇总尚未计算');
  return r;
}

export async function listView(auth: AuthView) {
  assertView(auth);
  if (process.env.DEMO_MODE === '1') {
    return [
      { period: '2026-09', drgCases: 125, dipCases: 88, insuranceSettlement: 1250000, patientOutOfPocket: 180000 },
      { period: '2026-08', drgCases: 118, dipCases: 82, insuranceSettlement: 1180000, patientOutOfPocket: 165000 },
      { period: '2026-07', drgCases: 110, dipCases: 75, insuranceSettlement: 1120000, patientOutOfPocket: 158000 },
    ];
  }
  return listSummaries();
}

export async function exportCsvView(auth: AuthView, period: string) {
  assertView(auth);
  const r = await getView(auth, period);
  return toCsv({ period: r.period, drgCases: r.drgCases, dipCases: r.dipCases, totalScore: r.totalScore, pointValue: r.pointValue, insuranceSettlement: r.insuranceSettlement, outOfPocket: r.patientOutOfPocket });
}
