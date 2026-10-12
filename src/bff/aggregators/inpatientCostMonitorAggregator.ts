/**
 * 健澜科技 jlmedaios - 在院费用监控聚合器（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getBudgetByGroup } from '../../db/repositories/drgBudgetRepo.js';
import {
  getByVisit,
  listMonitors,
  markDischargeReminded,
  upsertSnapshot,
} from '../../db/repositories/inpatientCostMonitorRepo.js';
import { levelOf, needsDischargeReview } from '../../medical-tools/operations/inpatientCostMonitor.js';
import { getByVisit as getSelectionByVisit } from '../../db/repositories/paymentSelectionRepo.js';
import { resolveBudgetBasis } from '../../medical-tools/operations/monitorBudgetBasis.js';

export class InpatientCostError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'InpatientCostError';
  }
}
const badRequest = (m: string) => new InpatientCostError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new InpatientCostError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new InpatientCostError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView): void {
  if (!auth.permissions.includes('inpatient_cost:view')) throw forbidden('缺少权限：inpatient_cost:view');
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 对某就诊刷新 snapshot：取预算 + 累计费用 → 纯函数定 level。 */
export async function refreshVisitView(
  auth: AuthView,
  input: { visitId: string; groupCode: string; accumulatedCost: number },
) {
  assertPermission(auth);
  if (!UUID_RE.test(input.visitId.trim())) throw badRequest('visit_id 非法');
  // M23-F：取该 visit 的 payment_selection → 纯函数定 DRG/DIP 预算基准与金额。
  const sel = await getSelectionByVisit(input.visitId);
  const basis = resolveBudgetBasis(sel);
  const budget = basis.basis === 'drg' ? await getBudgetByGroup(input.groupCode) : null;
  const warningRatio = budget ? Number(budget.warningRatio) : 1.1;
  const budgetCost = basis.basis === 'dip' ? basis.budget : budget ? Number(budget.expectedCost) : null;
  const ratio = budgetCost && budgetCost > 0 ? input.accumulatedCost / budgetCost : null;
  const level = levelOf(ratio, warningRatio);
  const row = await upsertSnapshot({
    visitId: input.visitId, groupCode: input.groupCode, budgetCost, budgetBasis: basis.basis,
    accumulatedCost: input.accumulatedCost, ratio, level,
  });
  await recordChainAudit(
    { actorId: auth.id, action: 'inpatient_cost.refresh', resourceType: 'inpatient_cost_monitor', resourceId: row.id, result: 'success', riskLevel: level === 'ok' ? 'low' : level === 'warn' ? 'medium' : 'high', detail: { level, ratio, budgetBasis: basis.basis } },
  );
  return row;
}

export async function listWardView(auth: AuthView) {
  assertPermission(auth);
  return listMonitors();
}

/** 出院前费用合理性提醒：level!=ok 且未 reminded → mark（幂等）。ok 级不提醒。 */
export async function dischargeReviewView(auth: AuthView, visitId: string) {
  assertPermission(auth);
  if (!UUID_RE.test(visitId.trim())) throw notFound('监控记录不存在');
  const current = await getByVisit(visitId);
  if (!current) throw notFound('监控记录不存在');
  const level = current.level as 'ok' | 'warn' | 'over';
  if (!needsDischargeReview(level, current.dischargeReviewReminded)) {
    return { discharged: false, reason: level === 'ok' ? 'level_ok' : 'already_reminded', level };
  }
  const r = await markDischargeReminded(visitId);
  await recordChainAudit(
    { actorId: auth.id, action: 'inpatient_cost.discharge_review', resourceType: 'inpatient_cost_monitor', resourceId: r ? r.id : current.id, result: 'success', riskLevel: level === 'over' ? 'high' : 'medium', detail: { level } },
  );
  return { discharged: true, reason: 'reminded', level };
}
