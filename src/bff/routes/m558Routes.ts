/**
 * 健澜科技 jlmedaios - M558 新标准 P4：会诊管理闭环（仅新增 3 个 POST 端点）
 *
 * 说明：GET /api/v1/consultations 已由既有 m198Routes.ts（静态 mock）注册在线，
 * 本路由文件**不重复注册**同路径 GET，仅补充真正缺失的 3 个状态机 POST 端点：
 *
 * POST /api/v1/consultations                      新建（status='requested'）
 * POST /api/v1/consultations/:id/accept           接单（requested→accepted；重复→409 already_accepted）
 * POST /api/v1/consultations/:id/complete          完成（未 accept 直接 complete→409 must_accept_first；已 completed→409 already_completed）
 *
 * 种子 12 条（内存态，仅用于 accept/complete 状态机演示）：覆盖 requested/accepted/completed；
 * 含 2 例 emergency overdue（requestedAt=1 小时前未接单，GET 时自动 overdue=true）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Urgency = 'routine' | 'urgent' | 'emergency';
const URGENCIES: Urgency[] = ['routine', 'urgent', 'emergency'];

type ConsultStatus = 'requested' | 'accepted' | 'completed';

interface ConsultRecord {
  id: string;
  patientId: string;
  visitId: string;
  requestDeptCode: string;
  consultDeptCode: string;
  reason: string;
  clinicalQuestion: string;
  urgency: Urgency;
  status: ConsultStatus;
  acceptedBy: string | null;
  acceptedAt: string | null;
  consultOpinion: string | null;
  recommendations: string[] | null;
  completedAt: string | null;
  overdue: boolean;
  requestedAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const conStore = new Map<string, ConsultRecord>();
let conSeq = 0;

function addCon(r: Omit<ConsultRecord, 'id'>): ConsultRecord {
  conSeq += 1;
  const rec: ConsultRecord = { ...r, id: `CON-${String(conSeq).padStart(3, '0')}` };
  conStore.set(rec.id, rec);
  return rec;
}

function seedCon(): void {
  const now = Date.now();
  const isoRep = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 4 条已 completed
  addCon({ patientId: 'P-C001', visitId: 'V-C001', requestDeptCode: 'internal', consultDeptCode: 'cardiology', reason: '胸闷待查', clinicalQuestion: '是否需冠脉造影', urgency: 'urgent', status: 'completed', acceptedBy: 'DOC-CARD-001', acceptedAt: isoRep(60 * 20), consultOpinion: '建议冠脉 CTA', recommendations: ['完善心电图', '查心肌酶'], completedAt: isoRep(60 * 10), overdue: false, requestedAt: isoRep(60 * 30) });
  addCon({ patientId: 'P-C002', visitId: 'V-C002', requestDeptCode: 'surgery', consultDeptCode: 'endocrinology', reason: '围术期血糖管理', clinicalQuestion: '胰岛素剂量调整方案', urgency: 'routine', status: 'completed', acceptedBy: 'DOC-ENDO-001', acceptedAt: isoRep(60 * 36), consultOpinion: '皮下胰岛素 4-4-4', recommendations: ['监测三餐前血糖'], completedAt: isoRep(60 * 24), overdue: false, requestedAt: isoRep(60 * 48) });
  addCon({ patientId: 'P-C003', visitId: 'V-C003', requestDeptCode: 'internal', consultDeptCode: 'nephrology', reason: 'CKD 用药调整', clinicalQuestion: '二甲双胍是否继续', urgency: 'routine', status: 'completed', acceptedBy: 'DOC-NEPH-001', acceptedAt: isoRep(60 * 48), consultOpinion: '停用二甲双胍', recommendations: ['复查 eGFR'], completedAt: isoRep(60 * 30), overdue: false, requestedAt: isoRep(60 * 60) });
  addCon({ patientId: 'P-C004', visitId: 'V-C004', requestDeptCode: 'icu', consultDeptCode: 'neurology', reason: '意识障碍', clinicalQuestion: '是否需脑电图', urgency: 'emergency', status: 'completed', acceptedBy: 'DOC-NEURO-001', acceptedAt: isoRep(60 * 2), consultOpinion: '紧急脑电图', recommendations: ['暂缓拔管'], completedAt: isoRep(60 * 1), overdue: false, requestedAt: isoRep(60 * 3) });

  // 2 条已 accepted
  addCon({ patientId: 'P-C005', visitId: 'V-C005', requestDeptCode: 'internal', consultDeptCode: 'gastroenterology', reason: '便血待查', clinicalQuestion: '是否急诊肠镜', urgency: 'urgent', status: 'accepted', acceptedBy: 'DOC-GI-001', acceptedAt: isoRep(60 * 2), consultOpinion: null, recommendations: null, completedAt: null, overdue: false, requestedAt: isoRep(60 * 6) });
  addCon({ patientId: 'P-C006', visitId: 'V-C006', requestDeptCode: 'pediatrics', consultDeptCode: 'dermatology', reason: '皮疹', clinicalQuestion: '是否需激素', urgency: 'routine', status: 'accepted', acceptedBy: 'DOC-DERM-001', acceptedAt: isoRep(60 * 30), consultOpinion: null, recommendations: null, completedAt: null, overdue: false, requestedAt: isoRep(60 * 36) });

  // 6 条 requested，其中 2 例 emergency 已超 30min 未接单（overdue）
  addCon({ patientId: 'P-C007', visitId: 'V-C007', requestDeptCode: 'icu', consultDeptCode: 'cardiology', reason: '急性胸痛', clinicalQuestion: '是否紧急 PCI', urgency: 'emergency', status: 'requested', acceptedBy: null, acceptedAt: null, consultOpinion: null, recommendations: null, completedAt: null, overdue: true, requestedAt: isoRep(60) });
  addCon({ patientId: 'P-C008', visitId: 'V-C008', requestDeptCode: 'emergency', consultDeptCode: 'neurology', reason: '脑疝', clinicalQuestion: '是否开颅', urgency: 'emergency', status: 'requested', acceptedBy: null, acceptedAt: null, consultOpinion: null, recommendations: null, completedAt: null, overdue: true, requestedAt: isoRep(60) });
  addCon({ patientId: 'P-C009', visitId: 'V-C009', requestDeptCode: 'internal', consultDeptCode: 'pulmonology', reason: '慢性咳嗽', clinicalQuestion: '是否需肺功能', urgency: 'routine', status: 'requested', acceptedBy: null, acceptedAt: null, consultOpinion: null, recommendations: null, completedAt: null, overdue: false, requestedAt: isoRep(60 * 2) });
  addCon({ patientId: 'P-C010', visitId: 'V-C010', requestDeptCode: 'surgery', consultDeptCode: 'anesthesia', reason: '术前评估', clinicalQuestion: 'ASA 分级', urgency: 'routine', status: 'requested', acceptedBy: null, acceptedAt: null, consultOpinion: null, recommendations: null, completedAt: null, overdue: false, requestedAt: isoRep(60 * 1) });
  addCon({ patientId: 'P-C011', visitId: 'V-C011', requestDeptCode: 'internal', consultDeptCode: 'oncology', reason: '占位性质', clinicalQuestion: '是否需活检', urgency: 'urgent', status: 'requested', acceptedBy: null, acceptedAt: null, consultOpinion: null, recommendations: null, completedAt: null, overdue: false, requestedAt: isoRep(30) });
  addCon({ patientId: 'P-C012', visitId: 'V-C012', requestDeptCode: 'pediatrics', consultDeptCode: 'cardiology', reason: '杂音', clinicalQuestion: '是否心脏超声', urgency: 'routine', status: 'requested', acceptedBy: null, acceptedAt: null, consultOpinion: null, recommendations: null, completedAt: null, overdue: false, requestedAt: isoRep(15) });
}
seedCon();

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` },
      ],
    },
    404,
  );
}

// ============================== POST /api/v1/consultations ==============================

async function handleConCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const patientId = body.patientId;
  const visitId = body.visitId;
  const requestDeptCode = body.requestDeptCode;
  const consultDeptCode = body.consultDeptCode;
  const reason = body.reason;
  const clinicalQuestion = body.clinicalQuestion;
  const urgency = body.urgency;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof requestDeptCode !== 'string' || !requestDeptCode.trim() ||
    typeof consultDeptCode !== 'string' || !consultDeptCode.trim() ||
    typeof reason !== 'string' || !reason.trim() ||
    typeof clinicalQuestion !== 'string' || !clinicalQuestion.trim() ||
    typeof urgency !== 'string' || !URGENCIES.includes(urgency as Urgency)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addCon({
    patientId: patientId.trim(),
    visitId: visitId.trim(),
    requestDeptCode: requestDeptCode.trim(),
    consultDeptCode: consultDeptCode.trim(),
    reason: reason.trim(),
    clinicalQuestion: clinicalQuestion.trim(),
    urgency: urgency as Urgency,
    status: 'requested',
    acceptedBy: null,
    acceptedAt: null,
    consultOpinion: null,
    recommendations: null,
    completedAt: null,
    overdue: false,
    requestedAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== POST /api/v1/consultations/:id/accept ==============================

async function handleConAccept(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = conStore.get(id);
  if (!rec) return notFound('Consultation', id);

  if (rec.status !== 'requested') {
    return json({ code: 409, message: 'already_accepted' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const acceptedBy = body.acceptedBy;
  if (typeof acceptedBy !== 'string' || !acceptedBy.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.acceptedBy = acceptedBy.trim();
  rec.acceptedAt = new Date().toISOString();
  rec.status = 'accepted';
  rec.overdue = false;
  return json(ok(rec), 200);
}

// ============================== POST /api/v1/consultations/:id/complete ==============================

async function handleConComplete(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = conStore.get(id);
  if (!rec) return notFound('Consultation', id);

  if (rec.status === 'requested') {
    return json({ code: 409, message: 'must_accept_first' }, 409);
  }
  if (rec.status === 'completed') {
    return json({ code: 409, message: 'already_completed' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const consultOpinion = body.consultOpinion;
  const recommendations = body.recommendations;

  if (
    typeof consultOpinion !== 'string' || !consultOpinion.trim() ||
    !Array.isArray(recommendations)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.consultOpinion = consultOpinion.trim();
  rec.recommendations = recommendations as string[];
  rec.completedAt = new Date().toISOString();
  rec.status = 'completed';
  return json(ok(rec), 200);
}

export const m558Routes: RouteDef[] = [
  // GET /api/v1/consultations 已由 m198Routes.ts 注册（静态 mock），本文件仅注册 3 个 POST 状态机端点
  { method: 'POST', path: '/api/v1/consultations', handle: handleConCreate, auth: true },
  { method: 'POST', path: '/api/v1/consultations/:id/accept', handle: handleConAccept, auth: true },
  { method: 'POST', path: '/api/v1/consultations/:id/complete', handle: handleConComplete, auth: true },
];
