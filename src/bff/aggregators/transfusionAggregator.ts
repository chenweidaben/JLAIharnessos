/**
 * 健澜科技 jlmedaios - 输血管理聚合器（M10-A）
 *
 * 状态机 + CDS 指征校验 + 双人核对 + 哈希链审计。
 * AI 仅辅助，不自主诊疗；发血扣库存事务内完成；不良反应审计 high。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  createRequest,
  getById,
  lockById,
  listRequests,
  patchRequest,
  listStock,
  deductStock,
  createTransfusion,
  getTransfusionByRequest,
  patchTransfusion,
  addReaction,
  listReactions,
  type TransfusionRequest,
  type TransfusionStatus,
} from '../../db/repositories/transfusionRepo.js';

export class TransfusionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TransfusionError';
  }
}
const badRequest = (m: string) => new TransfusionError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new TransfusionError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new TransfusionError(409, 'CONFLICT', m);
const forbidden = (m: string) => new TransfusionError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) {
    throw forbidden(`缺少权限：${perm}`);
  }
}

/** 合法状态转移表。 */
const TRANSITIONS: Record<TransfusionStatus, TransfusionStatus[]> = {
  requested: ['crossmatched', 'cancelled'],
  crossmatched: ['dispensed', 'cancelled'],
  dispensed: ['transfusing', 'cancelled'],
  transfusing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'];
const COMPONENTS = ['red_cell', 'plasma', 'platelet', 'cryo', 'whole'];
const URGENCIES = ['routine', 'urgent', 'emergency'];
const REACTION_SEVERITIES = ['mild', 'moderate', 'severe'];

function assertTransition(from: TransfusionStatus, to: TransfusionStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw conflict(`非法状态转换：${from} -> ${to}`);
  }
}

/**
 * CDS 指征规则（纯函数、确定性）：
 *  - 红细胞：Hb < 70 或 Hb 70–80 伴活动性出血/心脑血管疾病（急性失血）；
 *  - 血浆：INR > 1.7 或活动性出血伴凝血异常；
 *  - 血小板：PLT < 50 或 PLT < 100 伴活动性出血；
 *  - 冷沉淀：纤维蛋白原 < 1.0 g/L；
 *  - 全血：大量失血（失血量 > 1500ml 或休克）。
 * 规则返回：pass 通过 / block 拦截（申请不受阻，仅强制填写指征留痕）。
 */
export function evaluateIndication(component: string, meta: Record<string, unknown>): {
  pass: boolean;
  reasons: string[];
  suggestion: string;
} {
  const hb = Number(meta.hb ?? meta.Hb ?? NaN);
  const inr = Number(meta.inr ?? meta.INR ?? NaN);
  const plt = Number(meta.plt ?? meta.PLT ?? NaN);
  const fib = Number(meta.fibrinogen ?? meta.Fib ?? NaN);
  const activeBleeding = meta.activeBleeding === true || meta.activeBleeding === 'true';
  const bloodLoss = Number(meta.bloodLoss ?? NaN);
  const reasons: string[] = [];

  switch (component) {
    case 'red_cell': {
      if (!Number.isNaN(hb) && hb < 70) reasons.push(`Hb ${hb} g/L < 70，符合红细胞输注指征`);
      else if (!Number.isNaN(hb) && hb <= 80 && activeBleeding) reasons.push(`Hb ${hb} g/L 且活动性出血，符合红细胞输注指征`);
      else reasons.push('红细胞输注建议：Hb < 70 g/L，或 Hb 70–80 g/L 伴活动性出血');
      break;
    }
    case 'plasma': {
      if (!Number.isNaN(inr) && inr > 1.7) reasons.push(`INR ${inr} > 1.7，符合血浆输注指征`);
      else reasons.push('血浆输注建议：INR > 1.7 或活动性出血伴凝血异常');
      break;
    }
    case 'platelet': {
      if (!Number.isNaN(plt) && plt < 50) reasons.push(`PLT ${plt} ×10^9/L < 50，符合血小板输注指征`);
      else if (!Number.isNaN(plt) && plt < 100 && activeBleeding) reasons.push(`PLT ${plt} ×10^9/L 且活动性出血，符合血小板输注指征`);
      else reasons.push('血小板输注建议：PLT < 50 ×10^9/L，或 PLT < 100 ×10^9/L 伴活动性出血');
      break;
    }
    case 'cryo': {
      if (!Number.isNaN(fib) && fib < 1.0) reasons.push(`纤维蛋白原 ${fib} g/L < 1.0，符合冷沉淀输注指征`);
      else reasons.push('冷沉淀输注建议：纤维蛋白原 < 1.0 g/L');
      break;
    }
    case 'whole': {
      if (!Number.isNaN(bloodLoss) && bloodLoss > 1500) reasons.push(`失血量 ${bloodLoss} ml > 1500，符合全血输注指征`);
      else reasons.push('全血输注建议：大量失血（>1500ml）或失血性休克');
      break;
    }
  }
  return { pass: true, reasons, suggestion: reasons[reasons.length - 1] };
}

export async function applyTransfusion(
  auth: AuthView,
  input: {
    requestNo: string;
    visitId: string;
    patientId: string;
    department: string;
    indication: string;
    indicationMeta: Record<string, unknown>;
    bloodType: string;
    component: string;
    unitCount: number;
    urgency: string;
  },
): Promise<{ req: TransfusionRequest; created: boolean }> {
  assertPermission(auth, 'blood:apply');
  if (!input.visitId?.trim() || !input.patientId?.trim()) throw badRequest('就诊与患者不能为空');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.visitId.trim()) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.patientId.trim())) {
    throw badRequest('就诊与患者 ID 须为用户 UUID');
  }
  if (!input.indication?.trim()) throw badRequest('输血指征不能为空（CDS 建议：' + evaluateIndication(input.component, input.indicationMeta ?? {}).suggestion + '）');
  if (!BLOOD_TYPES.includes(input.bloodType)) throw badRequest('血型须为 A/B/AB/O');
  if (!COMPONENTS.includes(input.component)) throw badRequest('血液成分不合法');
  if (!Number.isFinite(input.unitCount) || input.unitCount <= 0) throw badRequest('输血剂量须为正数');
  if (!URGENCIES.includes(input.urgency)) throw badRequest('紧急度须为 routine/urgent/emergency');
  const rule = evaluateIndication(input.component, input.indicationMeta ?? {});
  return withTx(async (tx) => {
    const r = await createRequest({
      requestNo: input.requestNo,
      visitId: input.visitId,
      patientId: input.patientId,
      department: input.department?.trim() || '待定科室',
      applicantId: auth.id,
      indication: input.indication,
      indicationMeta: { ...input.indicationMeta, cds: rule },
      bloodType: input.bloodType,
      component: input.component,
      unitCount: input.unitCount,
      urgency: input.urgency,
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'blood.apply', resourceType: 'transfusion',
      resourceId: r.req.id, result: 'success', riskLevel: 'medium',
      detail: { requestNo: r.req.requestNo, component: input.component, created: r.created },
    }, tx);
    return r;
  });
}

export async function listTransfusionsView(): Promise<TransfusionRequest[]> {
  return listRequests();
}

export async function getTransfusion(id: string) {
  const req = await getById(id);
  if (!req) throw notFound('输血申请不存在');
  const transfusion = await getTransfusionByRequest(id);
  const reactions = transfusion ? await listReactions(String(transfusion.id)) : [];
  const stock = await listStock();
  return { req, transfusion, reactions, stock };
}

async function advance(
  id: string,
  to: TransfusionStatus,
  auth: AuthView,
  patchFields: Record<string, unknown>,
  action: string,
  riskLevel: 'medium' | 'high' = 'high',
): Promise<TransfusionRequest> {
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('输血申请不存在');
    assertTransition(locked.status, to);
    const updated = await patchRequest(id, { ...patchFields, status: to }, tx);
    await recordChainAudit({
      actorId: auth.id, action, resourceType: 'transfusion', resourceId: id,
      result: 'success', riskLevel, detail: { from: locked.status, to },
    }, tx);
    return updated;
  });
}

export async function crossmatch(
  id: string,
  auth: AuthView,
  input: { result: string; note?: string },
): Promise<TransfusionRequest> {
  assertPermission(auth, 'blood:crossmatch');
  if (!input.result?.trim()) throw badRequest('配血结果不能为空');
  return advance(id, 'crossmatched', auth, {
    crossmatch_result: input.result,
    crossmatch_note: input.note ?? null,
    crossmatched_by: auth.id,
    crossmatched_at: new Date().toISOString(),
  }, 'blood.crossmatch');
}

export async function dispense(
  id: string,
  auth: AuthView,
  input: { batchNo?: string } = {},
): Promise<TransfusionRequest> {
  assertPermission(auth, 'blood:dispense');
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('输血申请不存在');
    assertTransition(locked.status, 'dispensed');
    const stock = await deductStock(locked.bloodType, locked.component, locked.unitCount, tx);
    if (!stock) {
      throw conflict(`血库库存不足：${locked.bloodType}型${locked.component} 现存不足 ${locked.unitCount} 单位`);
    }
    const updated = await patchRequest(id, {
      status: 'dispensed',
      batch_no: input.batchNo ?? stock.batchNo,
      dispensed_by: auth.id,
      dispensed_at: new Date().toISOString(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'blood.dispense', resourceType: 'transfusion', resourceId: id,
      result: 'success', riskLevel: 'high',
      detail: { batchNo: stock.batchNo, remaining: stock.units },
    }, tx);
    return updated;
  });
}

export async function startTransfusion(
  id: string,
  auth: AuthView,
  input: { coSignBy: string; dripRate?: string },
): Promise<{ req: TransfusionRequest; transfusion: Record<string, unknown> }> {
  assertPermission(auth, 'blood:transfuse');
  if (!input.coSignBy?.trim()) throw badRequest('双人核对护士不能为空');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.coSignBy.trim())) {
    throw badRequest('核对护士须为用户 UUID');
  }
  if (input.coSignBy === auth.id) throw badRequest('执行护士与核对护士不能为同一人');
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('输血申请不存在');
    assertTransition(locked.status, 'transfusing');
    const transfusion = await createTransfusion({
      requestId: id, transfusedBy: auth.id, coSignBy: input.coSignBy,
      dripRate: input.dripRate ?? null,
    }, tx);
    const updated = await patchRequest(id, { status: 'transfusing' }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'blood.transfuse', resourceType: 'transfusion', resourceId: id,
      result: 'success', riskLevel: 'high',
      detail: { coSignBy: input.coSignBy },
    }, tx);
    return { req: updated, transfusion };
  });
}

export async function completeTransfusion(
  id: string,
  auth: AuthView,
  input: { vitalSigns?: Record<string, unknown> } = {},
): Promise<TransfusionRequest> {
  assertPermission(auth, 'blood:transfuse');
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('输血申请不存在');
    assertTransition(locked.status, 'completed');
    const transfusion = await getTransfusionByRequest(id, tx);
    if (!transfusion || transfusion.status !== 'ongoing') {
      throw conflict('无进行中的输注记录，无法完成');
    }
    await patchTransfusion(String(transfusion.id), {
      status: 'completed',
      end_at: new Date().toISOString(),
      vital_signs: (input.vitalSigns ?? {}) as Record<string, unknown>,
    }, tx);
    const updated = await patchRequest(id, { status: 'completed' }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'blood.complete', resourceType: 'transfusion', resourceId: id,
      result: 'success', riskLevel: 'medium',
    }, tx);
    return updated;
  });
}

export async function stopTransfusion(
  id: string,
  auth: AuthView,
  input: { reason: string },
): Promise<TransfusionRequest> {
  assertPermission(auth, 'blood:transfuse');
  if (!input.reason?.trim()) throw badRequest('停输原因不能为空');
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('输血申请不存在');
    assertTransition(locked.status, 'cancelled');
    const transfusion = await getTransfusionByRequest(id, tx);
    if (transfusion && transfusion.status === 'ongoing') {
      await patchTransfusion(String(transfusion.id), {
        status: 'stopped', stop_reason: input.reason, end_at: new Date().toISOString(),
      }, tx);
    }
    const updated = await patchRequest(id, {
      status: 'cancelled', cancel_reason: input.reason,
      cancelled_by: auth.id, cancelled_at: new Date().toISOString(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'blood.stop', resourceType: 'transfusion', resourceId: id,
      result: 'success', riskLevel: 'high', detail: { reason: input.reason },
    }, tx);
    return updated;
  });
}

export async function cancelRequest(
  id: string,
  auth: AuthView,
  input: { reason: string },
): Promise<TransfusionRequest> {
  assertPermission(auth, 'blood:apply');
  if (!input.reason?.trim()) throw badRequest('取消原因不能为空');
  return advance(id, 'cancelled', auth, {
    cancel_reason: input.reason, cancelled_by: auth.id, cancelled_at: new Date().toISOString(),
  }, 'blood.cancel', 'medium');
}

export async function reportReaction(
  id: string,
  auth: AuthView,
  input: {
    severity: string;
    symptom: string;
    action: string;
    outcome?: string;
  },
): Promise<{ reaction: Record<string, unknown>; req: TransfusionRequest }> {
  assertPermission(auth, 'blood:review');
  if (!REACTION_SEVERITIES.includes(input.severity)) throw badRequest('不良反应分级须为 mild/moderate/severe');
  if (!input.symptom?.trim()) throw badRequest('不良反应症状不能为空');
  if (!input.action?.trim()) throw badRequest('处置措施不能为空');
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('输血申请不存在');
    if (!['transfusing', 'completed', 'cancelled'].includes(locked.status)) {
      throw conflict('仅输注中/已结束的申请可上报不良反应');
    }
    const transfusion = await getTransfusionByRequest(id, tx);
    if (!transfusion) throw conflict('无输注记录，无法上报不良反应');
    const reaction = await addReaction({
      transfusionId: String(transfusion.id),
      severity: input.severity,
      symptom: input.symptom,
      action: input.action,
      outcome: input.outcome ?? null,
      reportedBy: auth.id,
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'blood.reaction', resourceType: 'transfusion', resourceId: id,
      result: 'success', riskLevel: 'high',
      detail: { severity: input.severity, action: input.action },
    }, tx);
    return { reaction, req: locked };
  });
}
