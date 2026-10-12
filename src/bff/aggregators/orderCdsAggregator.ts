/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS 聚合器（M18-A）
 *
 * 独立 CDS 评估/留痕叠加层，不破坏既有开方流程。
 * 复用 inpatientCareAggregator.canAccessVisit（越权403）；
 * hard 且无 override_reason → 422；override 本人留痕；recordChainAudit。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  countUnresolvedHard,
  getAlertById,
  insertAlert,
  listByOrder,
  listByVisit,
  overrideAlert,
} from '../../db/repositories/orderCdsRepo.js';
import { evaluateCds, hasHardBlock, type OrderInput } from '../../medical-tools/order/cdsRules.js';

export class OrderCdsError extends Error {
  constructor(public status: number, public code: string, message: string, public alerts?: unknown[]) {
    super(message);
    this.name = 'OrderCdsError';
  }
}
const badRequest = (m: string) => new OrderCdsError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new OrderCdsError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new OrderCdsError(422, 'CDS_BLOCKED', m);
const forbidden = (m: string) => new OrderCdsError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围，无法操作该患者');
  return visit;
}

/**
 * 评估候选医嘱的 CDS。
 * hard 命中且无 overrideReason → 422 并回传 alerts；
 * 否则落库所有 alerts 并返回。
 */
export async function evaluateCdsView(
  auth: AuthView,
  input: {
    orderId: string;
    visitId: string;
    order: OrderInput;
    allergies?: string[];
    activeOrders?: { drugName: string; status?: string }[];
    overrideReason?: string;
  },
) {
  assertPermission(auth, 'cds:read');
  assertUuid(input.orderId, '医嘱');
  assertUuid(input.visitId, '就诊');
  const visit = await loadVisit(auth, input.visitId);

  const alerts = evaluateCds(input.order, input.allergies ?? [], input.activeOrders ?? []);
  const hardBlock = hasHardBlock(alerts);
  if (hardBlock && !(input.overrideReason ?? '').trim()) {
    throw new OrderCdsError(422, 'CDS_BLOCKED', 'CDS hard 拦截：须填写 override_reason 方可放行', alerts as unknown[]);
  }

  return withTx(async (tx) => {
    const saved = [];
    for (const a of alerts) {
      saved.push(await insertAlert(
        { orderId: input.orderId, visitId: visit.id, patientId: visit.patientId, ruleCode: a.ruleCode, severity: a.severity, message: a.message },
        tx,
      ));
    }
    await recordChainAudit(
      { actorId: auth.id, action: 'order_cds.evaluate', resourceType: 'visit', resourceId: visit.id, result: 'success', riskLevel: hardBlock ? 'high' : 'low', detail: { orderId: input.orderId, alerts: saved.length, overridden: hardBlock } },
      tx,
    );
    return { alerts: saved, overridden: hardBlock };
  });
}

/** override 单条 hard alert。 */
export async function overrideAlertView(auth: AuthView, alertId: string, reason: string) {
  assertPermission(auth, 'cds:override');
  assertUuid(alertId, '告警');
  if (!reason || !reason.trim()) throw badRequest('override_reason 必填');
  const alert = await getAlertById(alertId);
  if (!alert) throw notFound('告警不存在');
  const visit = await loadVisit(auth, alert.visitId);
  return withTx(async (tx) => {
    const updated = await overrideAlert(alertId, auth.id, reason.trim(), tx);
    await recordChainAudit(
      { actorId: auth.id, action: 'order_cds.override', resourceType: 'visit', resourceId: visit.id, result: 'success', riskLevel: 'high', detail: { alertId, ruleCode: alert.ruleCode } },
      tx,
    );
    return updated;
  });
}

export async function listByVisitView(auth: AuthView, visitId: string) {
  assertPermission(auth, 'cds:read');
  assertUuid(visitId, '就诊');
  await loadVisit(auth, visitId);
  const alerts = await listByVisit(visitId);
  const unresolvedHard = await countUnresolvedHard(visitId);
  return { alerts, unresolvedHard };
}

export async function listByOrderView(auth: AuthView, orderId: string) {
  assertPermission(auth, 'cds:read');
  assertUuid(orderId, '医嘱');
  return listByOrder(orderId);
}
