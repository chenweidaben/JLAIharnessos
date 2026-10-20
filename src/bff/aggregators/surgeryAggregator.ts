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

/**
 * v5.0试点扩展（M188空数据修复）：DEMO_MODE 今日手术确定性种子。
 * 固定 6 台今日手术（台号/患者/术式/主刀/状态：已排/进行中/已完成混合），
 * 覆盖 requested/scheduled/prechecked/induction/maintenance/pacu/discharged 多状态，
 * 使前端 Tabs 各状态计数不再为 0；无随机、无 SQL，字段与真实 SurgeryRequest 一致。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
function buildDemoSurgeryList(): SurgeryRequest[] {
  const today = '2026-10-19';
  const fullPrecheck = {
    patient: true, procedure: true, anesthesiaMethod: true,
    surgeon: true, antibiotic: true, skinTest: true,
  };
  const rows: Array<Partial<SurgeryRequest> & {
    id: string; requestNo: string; visitId: string; patientId: string;
    surgeryType: string; plannedProcedure: string; diagnosis: string | null;
    plannedDate: string | null; department: string; status: SurgeryStatus;
  }> = [
    { id: 'demo-surg-01', requestNo: 'SUR20261019001', visitId: 'demo-visit-s01', patientId: 'demo-pat-s01', surgeryType: 'elective', plannedProcedure: '腹腔镜胆囊切除术', diagnosis: '胆囊结石伴慢性胆囊炎', plannedDate: today, department: '普外科', status: 'discharged', anesthesiaMethod: '全身麻醉', precheck: fullPrecheck, precheckedAt: `${today} 07:30`, startedAt: `${today} 08:00`, endedAt: `${today} 09:40`, surgeonSignedAt: `${today} 09:50`, anesthetistSignedAt: `${today} 09:48` },
    { id: 'demo-surg-02', requestNo: 'SUR20261019002', visitId: 'demo-visit-s02', patientId: 'demo-pat-s02', surgeryType: 'elective', plannedProcedure: '全髋关节置换术（左侧）', diagnosis: '左股骨颈骨折', plannedDate: today, department: '骨科', status: 'maintenance', anesthesiaMethod: '椎管内麻醉', precheck: fullPrecheck, precheckedAt: `${today} 08:10`, startedAt: `${today} 08:45`, surgeonSignedAt: null, anesthetistSignedAt: null },
    { id: 'demo-surg-03', requestNo: 'SUR20261019003', visitId: 'demo-visit-s03', patientId: 'demo-pat-s03', surgeryType: 'emergency', plannedProcedure: '剖腹探查+脾切除术', diagnosis: '外伤性脾破裂', plannedDate: today, department: '普外科', status: 'induction', anesthesiaMethod: '全身麻醉', precheck: fullPrecheck, precheckedAt: `${today} 09:20`, startedAt: `${today} 09:55`, surgeonSignedAt: null, anesthetistSignedAt: null },
    { id: 'demo-surg-04', requestNo: 'SUR20261019004', visitId: 'demo-visit-s04', patientId: 'demo-pat-s04', surgeryType: 'elective', plannedProcedure: '冠状动脉搭桥术（CABG）', diagnosis: '冠状动脉粥样硬化性心脏病 三支病变', plannedDate: today, department: '心血管外科', status: 'prechecked', anesthesiaMethod: '全身麻醉+体外循环', precheck: fullPrecheck, precheckedAt: `${today} 10:30`, startedAt: null, surgeonSignedAt: null, anesthetistSignedAt: null },
    { id: 'demo-surg-05', requestNo: 'SUR20261019005', visitId: 'demo-visit-s05', patientId: 'demo-pat-s05', surgeryType: 'elective', plannedProcedure: '经尿道前列腺电切术（TURP）', diagnosis: '良性前列腺增生', plannedDate: today, department: '泌尿外科', status: 'scheduled', anesthesiaMethod: '椎管内麻醉', precheck: {}, precheckedAt: null, startedAt: null, surgeonSignedAt: null, anesthetistSignedAt: null },
    { id: 'demo-surg-06', requestNo: 'SUR20261019006', visitId: 'demo-visit-s06', patientId: 'demo-pat-s06', surgeryType: 'elective', plannedProcedure: '白内障超声乳化+人工晶体植入术（右眼）', diagnosis: '右眼年龄相关性白内障', plannedDate: today, department: '眼科', status: 'pacu', anesthesiaMethod: '表面麻醉', precheck: fullPrecheck, precheckedAt: `${today} 11:00`, startedAt: `${today} 11:20`, endedAt: null, surgeonSignedAt: `${today} 11:45`, anesthetistSignedAt: `${today} 11:46` },
  ];
  return rows.map((r) => ({
    surgeonId: 'demo-surgeon', anesthetistId: 'demo-anesthetist',
    cancelReason: null, createdAt: `${today} 07:00`, updatedAt: `${today} 12:00`,
    ...r,
  } as SurgeryRequest));
}

export async function listRequestsView(): Promise<SurgeryRequest[]> {
  // v5.0试点扩展（M188空数据修复）：DEMO_MODE 下直接返回确定性演示手术列表，
  // 不再依赖 PostgreSQL 手术申请表（原为空导致各状态 Tab 计数全为 0）。
  if (process.env.DEMO_MODE === '1') {
    return buildDemoSurgeryList();
  }
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
