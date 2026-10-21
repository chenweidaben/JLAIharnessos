/**
 * 健澜科技 jlmedaios - M569 新标准 P6：急诊转诊闭环 4 端点
 *
 * GET  /api/v1/emergency-referrals?status=&toDeptCode=   列表（referredAt 倒序；过滤；GET 自动 overdue：red 级 30min 未接）
 * POST /api/v1/emergency-referrals                       新建（status=referred）
 * POST /api/v1/emergency-referrals/:id/accept            接诊（referred→accepted；重复 409 already_accepted）
 * POST /api/v1/emergency-referrals/:id/complete          完成（未 accept 直接 complete 409 must_accept_first；重复 409 already_completed）
 *
 * 种子 12 条：red/yellow/green 三档；2 条 red 级 overdue（referredAt=1 小时前未接单）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type TriageLevel = 'red' | 'yellow' | 'green';
const TRIAGE_LEVELS: TriageLevel[] = ['red', 'yellow', 'green'];

type RefStatus = 'referred' | 'accepted' | 'completed';

interface RefRecord {
  id: string;
  patientId: string;
  fromDeptCode: string;
  toDeptCode: string;
  referralReason: string;
  triageLevel: TriageLevel;
  referredBy: string;
  referredAt: string;
  status: RefStatus;
  overdue: boolean;
  acceptedBy: string | null;
  acceptedAt: string | null;
  treatmentSummary: string | null;
  dischargeDisposition: string | null;
  completedAt: string | null;
}

// ============================== 内存态库（DEMO 短路） ==============================

const refStore = new Map<string, RefRecord>();
let refSeq = 0;

function addRef(r: Omit<RefRecord, 'id'>): RefRecord {
  refSeq += 1;
  const rec: RefRecord = { ...r, id: `EMR-${String(refSeq).padStart(3, '0')}` };
  refStore.set(rec.id, rec);
  return rec;
}

function seedRef(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 2 条 red 级 overdue（referredAt=1 小时前未接单）
  addRef({ patientId: 'P-E001', fromDeptCode: 'emergency', toDeptCode: 'cardiology', referralReason: '急性胸痛', triageLevel: 'red', referredBy: 'DOC-EM-001', referredAt: iso(60 * 65), status: 'referred', overdue: false, acceptedBy: null, acceptedAt: null, treatmentSummary: null, dischargeDisposition: null, completedAt: null });
  addRef({ patientId: 'P-E002', fromDeptCode: 'emergency', toDeptCode: 'neurosurgery', referralReason: '颅脑外伤', triageLevel: 'red', referredBy: 'DOC-EM-002', referredAt: iso(60 * 60), status: 'referred', overdue: false, acceptedBy: null, acceptedAt: null, treatmentSummary: null, dischargeDisposition: null, completedAt: null });

  // 4 条 red/yellow/green 未到期（referredAt < 30min）
  addRef({ patientId: 'P-E003', fromDeptCode: 'emergency', toDeptCode: 'icu', referralReason: '感染性休克', triageLevel: 'red', referredBy: 'DOC-EM-001', referredAt: iso(15), status: 'referred', overdue: false, acceptedBy: null, acceptedAt: null, treatmentSummary: null, dischargeDisposition: null, completedAt: null });
  addRef({ patientId: 'P-E004', fromDeptCode: 'emergency', toDeptCode: 'internal', referralReason: '肺炎', triageLevel: 'yellow', referredBy: 'DOC-EM-003', referredAt: iso(20), status: 'referred', overdue: false, acceptedBy: null, acceptedAt: null, treatmentSummary: null, dischargeDisposition: null, completedAt: null });
  addRef({ patientId: 'P-E005', fromDeptCode: 'emergency', toDeptCode: 'pediatrics', referralReason: '小儿发热', triageLevel: 'green', referredBy: 'DOC-EM-004', referredAt: iso(10), status: 'referred', overdue: false, acceptedBy: null, acceptedAt: null, treatmentSummary: null, dischargeDisposition: null, completedAt: null });
  addRef({ patientId: 'P-E006', fromDeptCode: 'emergency', toDeptCode: 'surgery', referralReason: '急腹症', triageLevel: 'yellow', referredBy: 'DOC-EM-002', referredAt: iso(25), status: 'referred', overdue: false, acceptedBy: null, acceptedAt: null, treatmentSummary: null, dischargeDisposition: null, completedAt: null });

  // 3 条 accepted（已接单未完成）
  addRef({ patientId: 'P-E007', fromDeptCode: 'emergency', toDeptCode: 'cardiology', referralReason: '心律失常', triageLevel: 'red', referredBy: 'DOC-EM-001', referredAt: iso(60 * 50), status: 'accepted', overdue: false, acceptedBy: 'DOC-CARD-001', acceptedAt: iso(60 * 40), treatmentSummary: null, dischargeDisposition: null, completedAt: null });
  addRef({ patientId: 'P-E008', fromDeptCode: 'emergency', toDeptCode: 'orthopedics', referralReason: '骨折', triageLevel: 'yellow', referredBy: 'DOC-EM-003', referredAt: iso(60 * 30), status: 'accepted', overdue: false, acceptedBy: 'DOC-ORTH-001', acceptedAt: iso(60 * 25), treatmentSummary: null, dischargeDisposition: null, completedAt: null });
  addRef({ patientId: 'P-E009', fromDeptCode: 'emergency', toDeptCode: 'gastro', referralReason: '消化道出血', triageLevel: 'yellow', referredBy: 'DOC-EM-004', referredAt: iso(60 * 20), status: 'accepted', overdue: false, acceptedBy: 'DOC-GAS-001', acceptedAt: iso(60 * 18), treatmentSummary: null, dischargeDisposition: null, completedAt: null });

  // 3 条 completed
  addRef({ patientId: 'P-E010', fromDeptCode: 'emergency', toDeptCode: 'nephrology', referralReason: '急性肾衰', triageLevel: 'red', referredBy: 'DOC-EM-001', referredAt: iso(60 * 100), status: 'completed', overdue: false, acceptedBy: 'DOC-NEPH-001', acceptedAt: iso(60 * 90), treatmentSummary: '血液透析 2 次', dischargeDisposition: '好转出院', completedAt: iso(60 * 30) });
  addRef({ patientId: 'P-E011', fromDeptCode: 'emergency', toDeptCode: 'endocrinology', referralReason: '糖尿病酮症', triageLevel: 'red', referredBy: 'DOC-EM-002', referredAt: iso(60 * 80), status: 'completed', overdue: false, acceptedBy: 'DOC-ENDO-001', acceptedAt: iso(60 * 75), treatmentSummary: '胰岛素静滴纠正酮症', dischargeDisposition: '转普通病房', completedAt: iso(60 * 20) });
  addRef({ patientId: 'P-E012', fromDeptCode: 'emergency', toDeptCode: 'ent', referralReason: '小儿喉炎', triageLevel: 'green', referredBy: 'DOC-EM-004', referredAt: iso(60 * 60), status: 'completed', overdue: false, acceptedBy: 'DOC-ENT-001', acceptedAt: iso(60 * 55), treatmentSummary: '雾化吸入', dischargeDisposition: '当日离院', completedAt: iso(60 * 10) });
}
seedRef();

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

/** GET 时实时计算 overdue（不落库）：red 级 + status=referred + referredAt>30min 前 */
function withOverdue(r: RefRecord): RefRecord {
  const nowMs = Date.now();
  const refMs = Date.parse(r.referredAt);
  const overdue =
    r.triageLevel === 'red' && r.status === 'referred' &&
    Number.isFinite(refMs) && (nowMs - refMs) > 30 * 60_000;
  return { ...r, overdue };
}

// ============================== 1. GET /api/v1/emergency-referrals ==============================

async function handleRefList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const status = (c.query.get('status') ?? '').trim();
  const toDeptCode = (c.query.get('toDeptCode') ?? '').trim();

  let rows = Array.from(refStore.values());
  if (status) rows = rows.filter((r) => r.status === status);
  if (toDeptCode) rows = rows.filter((r) => r.toDeptCode === toDeptCode);
  rows = rows.sort((a, b) => b.referredAt.localeCompare(a.referredAt));
  const items = rows.map(withOverdue);
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. POST /api/v1/emergency-referrals ==============================

async function handleRefCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, fromDeptCode, toDeptCode, referralReason, triageLevel, referredBy } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof fromDeptCode !== 'string' || !fromDeptCode.trim() ||
    typeof toDeptCode !== 'string' || !toDeptCode.trim() ||
    typeof referralReason !== 'string' || !referralReason.trim() ||
    typeof triageLevel !== 'string' || !TRIAGE_LEVELS.includes(triageLevel as TriageLevel) ||
    typeof referredBy !== 'string' || !referredBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addRef({
    patientId: patientId.trim(),
    fromDeptCode: fromDeptCode.trim(),
    toDeptCode: toDeptCode.trim(),
    referralReason: referralReason.trim(),
    triageLevel: triageLevel as TriageLevel,
    referredBy: referredBy.trim(),
    referredAt: new Date().toISOString(),
    status: 'referred',
    overdue: false,
    acceptedBy: null,
    acceptedAt: null,
    treatmentSummary: null,
    dischargeDisposition: null,
    completedAt: null,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/emergency-referrals/:id/accept ==============================

async function handleRefAccept(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = refStore.get(id);
  if (!rec) return notFound('EmergencyReferral', id);

  if (rec.status !== 'referred') {
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

  rec.status = 'accepted';
  rec.overdue = false;
  rec.acceptedBy = acceptedBy.trim();
  rec.acceptedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/emergency-referrals/:id/complete ==============================

async function handleRefComplete(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = refStore.get(id);
  if (!rec) return notFound('EmergencyReferral', id);

  if (rec.status === 'completed') {
    return json({ code: 409, message: 'already_completed' }, 409);
  }
  if (rec.status === 'referred') {
    return json({ code: 409, message: 'must_accept_first' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { treatmentSummary, dischargeDisposition } = body as Record<string, unknown>;
  if (
    typeof treatmentSummary !== 'string' || !treatmentSummary.trim() ||
    typeof dischargeDisposition !== 'string' || !dischargeDisposition.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'completed';
  rec.treatmentSummary = treatmentSummary.trim();
  rec.dischargeDisposition = dischargeDisposition.trim();
  rec.completedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m569Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emergency-referrals', handle: handleRefList, auth: true },
  { method: 'POST', path: '/api/v1/emergency-referrals', handle: handleRefCreate, auth: true },
  { method: 'POST', path: '/api/v1/emergency-referrals/:id/accept', handle: handleRefAccept, auth: true },
  { method: 'POST', path: '/api/v1/emergency-referrals/:id/complete', handle: handleRefComplete, auth: true },
];
