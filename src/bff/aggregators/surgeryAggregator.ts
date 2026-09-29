/**
 * 健澜科技 jlmedaios - 手术麻醉聚合器（M3-H）
 *
 * 状态机 + 三方核对完整性 + 双签离室 + 哈希链审计。
 * AI 仅辅助，不自主诊疗；高风险环节双人核对 + 双签。
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
  patch,
  appendEvent,
  listEvents,
  upsertAnesthesia,
  addPacu,
  type SurgeryRequest,
  type SurgeryStatus,
} from '../../db/repositories/surgeryRepo.js';

export class SurgeryError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SurgeryError';
  }
}
const badRequest = (m: string) => new SurgeryError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new SurgeryError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new SurgeryError(409, 'CONFLICT', m);

/** 合法状态转移表。 */
const TRANSITIONS: Record<SurgeryStatus, SurgeryStatus[]> = {
  requested: ['scheduled', 'cancelled'],
  scheduled: ['prechecked', 'cancelled'],
  prechecked: ['induction', 'cancelled'],
  induction: ['maintenance'],
  maintenance: ['recovery'],
  recovery: ['pacu'],
  pacu: ['discharged'],
  discharged: [],
  cancelled: [],
};

/** 术前三方核对必须全部为 true 的项。 */
const PRECHECK_KEYS = ['patient', 'procedure', 'anesthesiaMethod', 'surgeon', 'antibiotic', 'skinTest'] as const;

export function computePrecheckComplete(precheck: Record<string, unknown>): boolean {
  return PRECHECK_KEYS.every((k) => precheck[k] === true);
}

export function canDischarge(req: SurgeryRequest, aldrete: number): boolean {
  return req.surgeonSignedAt != null && req.anesthetistSignedAt != null && aldrete >= 9;
}

function assertTransition(from: SurgeryStatus, to: SurgeryStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw conflict(`非法状态转换：${from} -> ${to}`);
  }
}

export async function submitRequest(auth: AuthView, input: {
  requestNo: string;
  visitId: string;
  patientId: string;
  surgeryType: string;
  plannedProcedure: string;
  diagnosis?: string | null;
  plannedDate?: string | null;
  department?: string;
}): Promise<{ req: SurgeryRequest; created: boolean }> {
  if (!input.plannedProcedure?.trim()) throw badRequest('手术术式不能为空');
  if (!['elective', 'emergency'].includes(input.surgeryType)) throw badRequest('手术类型须为 elective/emergency');
  return withTx(async (tx) => {
    const r = await createRequest({ ...input, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'surgery.submit', resourceType: 'surgery',
      resourceId: r.req.id, result: 'success', riskLevel: 'medium',
      detail: { requestNo: r.req.requestNo, created: r.created },
    }, tx);
    return r;
  });
}

export async function listRequestsView(): Promise<SurgeryRequest[]> {
  return listRequests();
}

export async function getSurgery(id: string) {
  const req = await getById(id);
  if (!req) throw notFound('手术申请不存在');
  const events = await listEvents(id);
  return { req, events };
}

async function advance(
  id: string,
  to: SurgeryStatus,
  auth: AuthView,
  patchFields: Record<string, unknown>,
  action: string,
): Promise<SurgeryRequest> {
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('手术申请不存在');
    assertTransition(locked.status, to);
    const updated = await patch(id, { ...patchFields, status: to }, tx);
    await recordChainAudit({
      actorId: auth.id, action, resourceType: 'surgery', resourceId: id,
      result: 'success', riskLevel: 'high', detail: { from: locked.status, to },
    }, tx);
    return updated;
  });
}

export async function schedule(id: string, auth: AuthView, input: {
  surgeonId?: string;
  anesthetistId?: string;
  anesthesiaMethod?: string;
  plannedDate?: string;
}): Promise<SurgeryRequest> {
  return advance(id, 'scheduled', auth, {
    surgeon_id: input.surgeonId ?? null,
    anesthetist_id: input.anesthetistId ?? null,
    anesthesia_method: input.anesthesiaMethod ?? null,
    planned_date: input.plannedDate ?? null,
  }, 'surgery.schedule');
}

export async function precheck(
  id: string,
  auth: AuthView,
  precheck: Record<string, unknown>,
): Promise<SurgeryRequest> {
  if (!computePrecheckComplete(precheck)) {
    throw badRequest('术前三方核对未完成：患者/术式/麻醉方式/术者/抗生素/皮试须全部确认');
  }
  return advance(id, 'prechecked', auth, { precheck, prechecked_at: new Date().toISOString() }, 'surgery.precheck');
}

export async function anesthesiaInduction(id: string, auth: AuthView, notes: string): Promise<SurgeryRequest> {
  if (!notes?.trim()) throw badRequest('麻醉诱导记录不能为空');
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('手术申请不存在');
    // 仅核对完成（prechecked）才能进入诱导
    assertTransition(locked.status, 'induction');
    if (!computePrecheckComplete(locked.precheck)) {
      throw badRequest('术前三方核对未完成，禁止进入麻醉诱导');
    }
    await upsertAnesthesia(id, { induction: notes }, tx);
    const updated = await patch(id, { status: 'induction', started_at: new Date().toISOString() }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'surgery.induction', resourceType: 'surgery', resourceId: id,
      result: 'success', riskLevel: 'high',
    }, tx);
    return updated;
  });
}

export async function intraopEvent(id: string, auth: AuthView, input: {
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<SurgeryRequest> {
  const req = await getById(id);
  if (!req) throw notFound('手术申请不存在');
  if (!['induction', 'maintenance', 'recovery'].includes(req.status)) {
    throw conflict('仅术中状态（诱导/维持/苏醒）可记录术中事件');
  }
  return withTx(async (tx) => {
    await appendEvent(id, input.eventType, input.payload, tx);
    const locked = await lockById(id, tx);
    return locked!;
  });
}

export async function stageTransition(
  id: string,
  to: 'maintenance' | 'recovery' | 'pacu',
  auth: AuthView,
  notes?: string,
): Promise<SurgeryRequest> {
  if (to === 'maintenance' && notes) await upsertAnesthesia(id, { maintenance: notes }, undefined);
  if (to === 'recovery' && notes) await upsertAnesthesia(id, { recovery: notes }, undefined);
  return advance(id, to, auth, {}, `surgery.${to}`);
}

/** PACU 评分；aldrete>=9 且双签则可离室。 */
export async function pacuAssess(id: string, auth: AuthView, input: {
  aldrete: number;
  note?: string;
}): Promise<{ req: SurgeryRequest; canDischarge: boolean }> {
  if (!(input.aldrete >= 0 && input.aldrete <= 10)) throw badRequest('Aldrete 评分须在 0-10');
  const req = await getById(id);
  if (!req) throw notFound('手术申请不存在');
  if (req.status !== 'pacu') throw conflict('仅 PACU 状态可做复苏评分');
  const can = canDischarge(req, input.aldrete);
  await withTx(async (tx) => {
    await addPacu(id, input.aldrete, auth.id, can, input.note ?? null, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'surgery.pacu', resourceType: 'surgery', resourceId: id,
      result: 'success', riskLevel: 'medium', detail: { aldrete: input.aldrete, can },
    }, tx);
  });
  return { req, canDischarge: can };
}

/** 双签：术者 / 麻醉医师分别签名。 */
export async function sign(id: string, auth: AuthView, role: 'surgeon' | 'anesthetist'): Promise<SurgeryRequest> {
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('手术申请不存在');
    if (locked.status === 'discharged' || locked.status === 'cancelled') {
      throw conflict('已终结的手术不可再签名');
    }
    const field = role === 'surgeon' ? 'surgeon_signed_at' : 'anesthetist_signed_at';
    if (locked[role === 'surgeon' ? 'surgeonSignedAt' : 'anesthetistSignedAt'] != null) {
      throw conflict('该角色已签名，不可重复签');
    }
    const updated = await patch(id, { [field]: new Date().toISOString() }, tx);
    await recordChainAudit({
      actorId: auth.id, action: `surgery.sign.${role}`, resourceType: 'surgery', resourceId: id,
      result: 'success', riskLevel: 'high',
    }, tx);
    return updated;
  });
}

/** 离室：要求 PACU 状态 + Aldrete>=9（最近一次）+ 双签齐全。 */
export async function discharge(id: string, auth: AuthView): Promise<SurgeryRequest> {
  return withTx(async (tx) => {
    const locked = await lockById(id, tx);
    if (!locked) throw notFound('手术申请不存在');
    assertTransition(locked.status, 'discharged');
    if (!locked.surgeonSignedAt || !locked.anesthetistSignedAt) {
      throw badRequest('须术者与麻醉医师双签齐全后方可离室');
    }
    const pacuRows = await tx`
      SELECT aldrete_total FROM clinical.pacu_assessments
      WHERE surgery_id = ${id} ORDER BY assessed_at DESC LIMIT 1
    `;
    const lastAldrete = pacuRows.length > 0 ? Number((pacuRows[0] as Record<string, unknown>).aldrete_total) : 0;
    if (lastAldrete < 9) {
      throw badRequest(`最近 Aldrete 评分 ${lastAldrete} < 9，不可离室`);
    }
    const updated = await patch(id, { status: 'discharged', ended_at: new Date().toISOString() }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'surgery.discharge', resourceType: 'surgery', resourceId: id,
      result: 'success', riskLevel: 'high',
    }, tx);
    return updated;
  });
}

export async function cancel(id: string, auth: AuthView, reason: string): Promise<SurgeryRequest> {
  if (!reason?.trim()) throw badRequest('取消原因不能为空');
  return advance(id, 'cancelled', auth, { cancel_reason: reason.trim() }, 'surgery.cancel');
}
