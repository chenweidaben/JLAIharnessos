/**
 * 健澜科技 jlmedaios - DRG 预算预警聚合器（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { classifyLevel } from '../../medical-tools/operations/drgBudget.js';
import {
  ackAlert,
  createAlert,
  getBudgetByGroup,
  listAlerts,
  listBudgets,
  upsertBudget,
} from '../../db/repositories/drgBudgetRepo.js';

export class DrgBudgetError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'DrgBudgetError';
  }
}
const badRequest = (m: string) => new DrgBudgetError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new DrgBudgetError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new DrgBudgetError(409, 'CONFLICT', m);
const forbidden = (m: string) => new DrgBudgetError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 医保办设/改预算。 */
export async function upsertBudgetView(auth: AuthView, input: { groupCode: string; expectedCost: number; warningRatio?: number }) {
  assertPermission(auth, 'drg_budget:manage');
  if (!input.groupCode) throw badRequest('group_code 必填');
  if (input.expectedCost < 0) throw badRequest('预算金额不能为负');
  return withTx(async (tx) => {
    const r = await upsertBudget(input, tx);
    await recordChainAudit(
      { actorId: auth.id, action: 'drg_budget.upsert', resourceType: 'drg_group_budgets', resourceId: r.id, result: 'success', riskLevel: 'low', detail: { groupCode: input.groupCode } },
      tx,
    );
    return r;
  });
}

export async function listBudgetsView(auth: AuthView) {
  assertPermission(auth, 'drg_budget:view');
  return listBudgets();
}

/** 对某就诊实际费用对照预算；超支则建 alert。 */
export async function evaluateVisitView(
  auth: AuthView,
  input: { visitId: string; groupCode: string; actualCost: number },
) {
  assertPermission(auth, 'drg_budget:view');
  if (!UUID_RE.test(input.visitId.trim())) throw badRequest('visit_id 非法');
  const budget = await getBudgetByGroup(input.groupCode);
  if (!budget) return { alert: null, reason: 'no_budget' };
  const level = classifyLevel(input.actualCost, Number(budget.expectedCost), Number(budget.warningRatio));
  if (!level) return { alert: null, reason: 'within_budget' };
  const r = await createAlert({
    visitId: input.visitId, groupCode: input.groupCode,
    actualCost: input.actualCost, budgetCost: Number(budget.expectedCost),
    ratio: input.actualCost / Number(budget.expectedCost), level,
  });
  await recordChainAudit(
    { actorId: auth.id, action: 'drg_alert.create', resourceType: 'drg_cost_alerts', resourceId: r.id, result: 'success', riskLevel: level === 'over' ? 'high' : 'medium', detail: { groupCode: input.groupCode, level } },
  );
  return { alert: r, reason: level };
}

export async function listAlertsView(auth: AuthView, onlyUnack = true) {
  assertPermission(auth, 'drg_budget:view');
  return listAlerts(onlyUnack);
}

export async function ackAlertView(auth: AuthView, alertId: string) {
  assertPermission(auth, 'drg_budget:view');
  if (!UUID_RE.test(alertId.trim())) throw notFound('告警不存在');
  const r = await ackAlert(alertId, auth.id);
  if (!r) throw conflict('告警已确认或不存在');
  return r;
}
