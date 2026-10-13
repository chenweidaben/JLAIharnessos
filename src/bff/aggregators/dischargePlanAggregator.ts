/**
 * 健澜科技 jlmedaios - 出院计划聚合器（M61-A）
 *
 * 出院前评估 -> 自动生成出院指导/用药摘要/复诊计划；
 * pushToPatient 复用 M20-A 通知中心推患者端；越权（数据范围外 visit）-> 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { createNotification } from '../../db/repositories/patientNotificationRepo.js';
import {
  createPlan, pushToPatient, getByVisit, listByVisit, type DischargePlan,
} from '../../db/repositories/dischargePlanRepo.js';
import { buildGuidance, suggestFollowup } from '../../medical-tools/nursing/dischargePlan.js';

export class DischargePlanError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'DischargePlanError';
  }
}
const notFound = (m: string) => new DischargePlanError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new DischargePlanError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new DischargePlanError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function assertVisitScope(auth: AuthView, visitId: string) {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
  return visit;
}

export interface PlanView {
  plan: DischargePlan;
  suggestedFollowupDate: string;
}

/** 生成出院计划（visit 唯一，已存在则返回既有计划）。 */
export async function planView(
  auth: AuthView,
  input: {
    visitId: string; medicationSummary: string; diagnoses?: string[]; followupDepartment?: string;
  },
): Promise<PlanView> {
  assertPermission(auth, 'discharge_plan:manage');
  const visitId = input.visitId.trim();
  if (!UUID_RE.test(visitId)) throw badRequest('就诊标识非法');
  const visit = await assertVisitScope(auth, visitId);

  const today = new Date().toISOString().slice(0, 10);
  const suggested = suggestFollowup(visit.department, today);
  const existing = await getByVisit(visitId);
  if (existing) return { plan: existing, suggestedFollowupDate: suggested };

  if (!input.medicationSummary?.trim()) throw badRequest('用药摘要必填');
  const guidance = buildGuidance(input.diagnoses ?? []);
  const dept = input.followupDepartment?.trim() || visit.department;

  return withTx(async (tx) => {
    const plan = await createPlan({
      visitId,
      dischargeGuidance: guidance,
      medicationSummary: input.medicationSummary.trim(),
      followupDate: suggested,
      followupDepartment: dept,
      createdBy: auth.id,
    }, tx);
    return { plan, suggestedFollowupDate: suggested };
  });
}

/** 推患者端：status=pushed + 建患者通知。 */
export async function pushView(auth: AuthView, id: string): Promise<DischargePlan> {
  assertPermission(auth, 'discharge_plan:manage');
  if (!UUID_RE.test(id.trim())) throw badRequest('计划标识非法');
  return withTx(async (tx) => {
    const plan = await pushToPatient(id.trim(), tx);
    const visit = await getVisitById(plan.visitId);
    if (!visit) throw notFound('就诊不存在');
    if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
    await createNotification({
      patientId: visit.patientId,
      notifType: 'report_pushed',
      title: '出院随访计划已生成',
      body: `复诊日期 ${plan.followupDate}，科室 ${plan.followupDepartment}。请按时复诊。`,
      refType: 'discharge_plan',
      refId: plan.id,
    }, tx);
    return plan;
  });
}

/** 按就诊列出计划。 */
export async function listView(auth: AuthView, visitId: string): Promise<DischargePlan[]> {
  assertPermission(auth, 'discharge_plan:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId.trim());
  return listByVisit(visitId.trim());
}
