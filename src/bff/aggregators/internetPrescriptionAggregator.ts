/**
 * 健澜科技 jlmedaios - 互联网电子处方聚合器（M3-L）
 *
 * 电子处方闭环：
 *  医生在图文问诊会话内开方（本人签名、禁止 AI 自动处方）
 *   → 提交待审方 → 药师审方（通过/驳回/退回）→ 状态机流转。
 *
 * 安全与职责分离：
 *  · 开方医生 = 接诊医生本人（prescriber 强制取 auth.id，签名语义）；
 *  · 无 AI 自动处方：明细必须医生显式录入，且每条至少含药名；
 *  · 开方/审方分离：医生走 internet:prescription，药师走
 *    internet:prescription:audit（路由层权限码强制，聚合器再校验角色）；
 *  · 退回/驳回必须填写审核意见；退回后医生可改明细重提；
 *  · 患者仅能查看本人处方。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getSessionById } from '../../db/repositories/consultationRepo.js';
import { getDrugByCode } from '../../db/repositories/drugRepo.js';
import {
  cancelEPrescription,
  createEPrescription,
  getEPrescriptionById,
  getEPrescriptionByIdem,
  listEPrescriptionsByPatient,
  listEPrescriptionsBySession,
  listEPrescriptionsForAudit,
  resubmitEPrescription,
  reviewEPrescription,
  updateEPrescriptionItems,
  type EPrescription,
  type EPrescriptionItem,
} from '../../db/repositories/internetPrescriptionRepo.js';
import type { AuthView } from '../view/userView.js';

export class EPrescriptionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'EPrescriptionError';
  }
}
const badRequest = (m: string) => new EPrescriptionError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new EPrescriptionError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new EPrescriptionError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new EPrescriptionError(409, 'CONFLICT', m);

function isDoctor(auth: AuthView): boolean {
  return auth.rawRoles.includes('doctor');
}
function isPharmacist(auth: AuthView): boolean {
  return auth.rawRoles.includes('pharmacist');
}

/** 校验明细：医生显式录入，每条至少药名；无任何药品则拒绝（禁止空方/AI 自动处方）。 */
function validateItems(items: unknown): EPrescriptionItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest('处方至少包含一种药品，且须由医生逐项录入（禁止自动处方）');
  }
  if (items.length > 20) throw badRequest('单张处方药品数量不能超过 20 种');
  return items.map((raw) => {
    const it = raw as Record<string, unknown>;
    if (typeof it.drugName !== 'string' || !it.drugName.trim()) {
      throw badRequest('药品名称不能为空（须医生手动选择）');
    }
    return {
      drugCode: it.drugCode ? String(it.drugCode) : null,
      drugName: it.drugName.trim(),
      specification: it.specification ? String(it.specification) : null,
      dosage: it.dosage !== undefined && it.dosage !== null ? Number(it.dosage) : null,
      dosageUnit: it.dosageUnit ? String(it.dosageUnit) : null,
      frequency: it.frequency ? String(it.frequency) : null,
      route: it.route ? String(it.route) : null,
      daysSupply: it.daysSupply !== undefined && it.daysSupply !== null ? Number(it.daysSupply) : null,
      quantity: it.quantity !== undefined && it.quantity !== null ? Number(it.quantity) : null,
      quantityUnit: it.quantityUnit ? String(it.quantityUnit) : null,
      skinTest: Boolean(it.skinTest),
      remark: it.remark ? String(it.remark) : null,
    };
  });
}

/** 计算总费用：按药品目录价格 × 数量合计（目录无价则按 0 计，聚合器不臆造价格）。 */
async function computeTotalFee(items: EPrescriptionItem[]): Promise<number> {
  let total = 0;
  for (const it of items) {
    if (it.drugCode) {
      const drug = await getDrugByCode(it.drugCode);
      if (drug?.price != null) {
        total += drug.price * (it.quantity ?? 1);
      }
    }
  }
  return Math.round(total * 100) / 100;
}

/** 宽松输入项（医生/前端可只填药名，缺省字段由 validateItems 规范化补 null） */
export interface EPrescriptionItemInput {
  drugCode?: string | null;
  drugName: string;
  specification?: string | null;
  dosage?: number | null;
  dosageUnit?: string | null;
  frequency?: string | null;
  route?: string | null;
  daysSupply?: number | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  skinTest?: boolean;
  remark?: string | null;
}

/** 医生：会话内开方（本人签名；同一幂等键防重复提交）。 */
export async function createEPrescriptionByDoctor(
  auth: AuthView,
  input: {
    sessionId: string;
    items: EPrescriptionItemInput[];
    counsel?: string;
    idempotencyKey: string;
  },
): Promise<EPrescription> {
  if (!isDoctor(auth)) throw forbidden('仅医生可开立电子处方');
  if (!input.sessionId?.trim()) throw badRequest('缺少问诊会话 ID');
  if (!input.idempotencyKey?.trim()) throw badRequest('缺少幂等键');
  const items = validateItems(input.items);

  const session = await getSessionById(input.sessionId);
  if (!session) throw notFound('问诊会话不存在');
  if (session.doctorId !== auth.id) throw forbidden('仅接诊医生本人可在会话内开方');
  if (session.status !== 'in_consultation') {
    throw conflict(`仅问诊中可开立处方，当前会话状态 ${session.status}`);
  }

  const dup = await getEPrescriptionByIdem(input.idempotencyKey);
  if (dup) throw conflict('该处方已提交（幂等键重复），请勿重复开方');

  const totalFee = await computeTotalFee(items);

  return withTx(async (tx) => {
    const rx = await createEPrescription(
      {
        sessionId: session.id,
        accountId: session.accountId,
        profileId: session.profileId,
        patientId: session.patientId,
        prescriberId: auth.id,
        department: session.department,
        items,
        counsel: input.counsel?.trim() || null,
        riskLevel: items.some((i) => i.skinTest) ? 'high' : 'medium',
        idempotencyKey: input.idempotencyKey,
        totalFee,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'internet.prescription_create',
        resourceType: 'internet_prescription',
        resourceId: rx.id,
        patientRef: session.patientId,
        result: 'success',
        riskLevel: 'medium',
        detail: { rxNo: rx.rxNo, itemCount: items.length, totalFee },
      },
      tx,
    );
    return rx;
  });
}

/** 医生：退回后修改明细并重提（returned → pending_review）。 */
export async function resubmitEPrescriptionByDoctor(
  auth: AuthView,
  input: { prescriptionId: string; items: EPrescriptionItemInput[] },
): Promise<EPrescription> {
  if (!isDoctor(auth)) throw forbidden('仅医生可修改并重提电子处方');
  const items = validateItems(input.items);
  return withTx(async (tx) => {
    const rx = await getEPrescriptionById(input.prescriptionId, tx);
    if (!rx) throw notFound('电子处方不存在');
    if (rx.prescriberId !== auth.id) throw forbidden('仅开方医生本人可修改重提');
    if (rx.status !== 'returned') {
      throw conflict(`仅退回处方可修改重提，当前状态 ${rx.status}`);
    }
    await updateEPrescriptionItems(rx.id, items, tx);
    const updated = await resubmitEPrescription(rx.id, tx);
    if (!updated) throw conflict('处方状态已变化，重提失败');
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'internet.prescription_resubmit',
        resourceType: 'internet_prescription',
        resourceId: rx.id,
        patientRef: rx.patientId,
        result: 'success',
        riskLevel: 'medium',
        detail: { rxNo: rx.rxNo, itemCount: items.length },
      },
      tx,
    );
    return updated;
  });
}

/** 医生：取消处方（pending_review / returned → cancelled）。 */
export async function cancelEPrescriptionByDoctor(
  auth: AuthView,
  prescriptionId: string,
): Promise<EPrescription> {
  if (!isDoctor(auth)) throw forbidden('仅医生可取消电子处方');
  return withTx(async (tx) => {
    const rx = await getEPrescriptionById(prescriptionId, tx);
    if (!rx) throw notFound('电子处方不存在');
    if (rx.prescriberId !== auth.id) throw forbidden('仅开方医生本人可取消');
    const updated = await cancelEPrescription(rx.id, 'doctor:' + auth.id, tx);
    if (!updated) throw conflict(`当前状态 ${rx.status} 不可取消（仅待审方/已退回可取消）`);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'internet.prescription_cancel',
        resourceType: 'internet_prescription',
        resourceId: rx.id,
        patientRef: rx.patientId,
        result: 'success',
        riskLevel: 'low',
        detail: { rxNo: rx.rxNo },
      },
      tx,
    );
    return updated;
  });
}

/** 药师：审方（pending_review → approved / rejected / returned）。 */
export async function reviewEPrescriptionByPharmacist(
  auth: AuthView,
  input: {
    prescriptionId: string;
    decision: 'approved' | 'rejected' | 'returned';
    auditComment?: string;
  },
): Promise<EPrescription> {
  if (!isPharmacist(auth)) throw forbidden('仅药师可审方');
  if (!['approved', 'rejected', 'returned'].includes(input.decision)) {
    throw badRequest('审核动作仅支持 approved / rejected / returned');
  }
  if (input.decision !== 'approved' && !input.auditComment?.trim()) {
    throw badRequest('驳回或退回处方时必须填写审核意见');
  }
  return withTx(async (tx) => {
    const rx = await getEPrescriptionById(input.prescriptionId, tx);
    if (!rx) throw notFound('电子处方不存在');
    if (rx.status !== 'pending_review') {
      throw conflict(`仅待审方处方可审核，当前状态 ${rx.status}`);
    }
    const updated = await reviewEPrescription(
      rx.id,
      input.decision,
      auth.id,
      input.auditComment?.trim() ?? '',
      tx,
    );
    if (!updated) throw conflict('处方状态已变化，审核失败');
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: `internet.prescription_review.${input.decision}`,
        resourceType: 'internet_prescription',
        resourceId: rx.id,
        patientRef: rx.patientId,
        result: 'success',
        riskLevel: input.decision === 'approved' ? 'medium' : 'high',
        detail: { rxNo: rx.rxNo, comment: input.auditComment?.trim() ?? '' },
      },
      tx,
    );
    return updated;
  });
}

/** 药师：审方队列（可只查本人开方的，药师通常看全院）。 */
export async function listForAudit(
  auth: AuthView,
  options?: { status?: string; prescriberId?: string },
): Promise<EPrescription[]> {
  if (!isPharmacist(auth)) throw forbidden('仅药师可访问审方队列');
  return listEPrescriptionsForAudit({
    status: options?.status as EPrescription['status'] | undefined,
    prescriberId: options?.prescriberId,
  });
}

/** 医生：会话内处方列表（本人会话）。 */
export async function listSessionPrescriptions(
  auth: AuthView,
  sessionId: string,
): Promise<EPrescription[]> {
  if (!isDoctor(auth)) throw forbidden('仅医生可查看会话处方');
  const session = await getSessionById(sessionId);
  if (!session) throw notFound('问诊会话不存在');
  if (session.doctorId !== auth.id) throw forbidden('仅接诊医生可查看该会话处方');
  return listEPrescriptionsBySession(sessionId);
}

/** 患者：我的电子处方列表。 */
export async function listMyPrescriptions(
  accountId: string,
  patientId: string,
): Promise<EPrescription[]> {
  return listEPrescriptionsByPatient(patientId);
}

/** 患者：处方详情（仅本人）。 */
export async function getMyPrescription(
  accountId: string,
  patientId: string,
  prescriptionId: string,
): Promise<EPrescription> {
  const rx = await getEPrescriptionById(prescriptionId);
  if (!rx) throw notFound('电子处方不存在');
  if (rx.accountId !== accountId || rx.patientId !== patientId) {
    throw forbidden('不能查看他人电子处方');
  }
  return rx;
}
