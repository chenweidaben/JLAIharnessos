/**
 * 健澜科技 jlmedaios - M590 新标准 P12：随访计划 4 端点
 *
 * GET    /api/v1/follow-up-plans?patientId=&status=   列表（createdAt 倒序；GET 自动判定 overdue）
 * POST   /api/v1/follow-up-plans                      创建（status=planned）
 * POST   /api/v1/follow-up-plans/:id/complete          完成（planned→completed）
 * POST   /api/v1/follow-up-plans/:id/reschedule       改期（仅 planned 可改期）
 *
 * 种子 25 条：含 5 条 overdue（nextFollowUpDate 已过 planned）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type PlanType = 'post_discharge' | 'chronic_disease' | 'oncology' | 'maternity';
type FupStatus = 'planned' | 'completed' | 'cancelled';
type Outcome = 'recovered' | 'improved' | 'unchanged' | 'deteriorated' | 'dead';

interface FupRecord {
  id: string;
  patientId: string;
  visitId: string;
  planType: PlanType;
  nextFollowUpDate: string;
  followUpDeptCode: string;
  responsibleDoctorId: string;
  status: FupStatus;
  overdue: boolean;
  completedAt: string | null;
  resultNotes: string | null;
  outcome: Outcome | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const fupStore = new Map<string, FupRecord>();
let fupSeq = 0;

function addFup(r: Omit<FupRecord, 'id' | 'overdue'>): FupRecord {
  fupSeq += 1;
  const now = Date.now();
  const nextMs = Date.parse(r.nextFollowUpDate);
  const rec: FupRecord = { ...r, id: `FUP-${String(fupSeq).padStart(3, '0')}`, overdue: false };
  // GET 时自动判定 overdue（种子阶段也算一次）
  if (rec.status === 'planned' && Number.isFinite(nextMs) && nextMs < now) rec.overdue = true;
  fupStore.set(rec.id, rec);
  return rec;
}

function seedFup(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const futureIso = (offsetMin: number): string => new Date(now + offsetMin * 60_000).toISOString();
  const types: PlanType[] = ['post_discharge', 'chronic_disease', 'oncology', 'maternity'];

  // 25 条种子：前 5 条 overdue（nextFollowUpDate 已过）
  for (let i = 1; i <= 25; i++) {
    const isOverdue = i <= 5;
    addFup({
      patientId: `P-F${String(i).padStart(3, '0')}`,
      visitId: `V-F${String(i).padStart(3, '0')}`,
      planType: types[i % 4],
      nextFollowUpDate: isOverdue ? iso(60 * 24 * 5) : futureIso(60 * 24 * 7),
      followUpDeptCode: `DEPT-${(i % 5) + 1}`,
      responsibleDoctorId: `DOC-FUP-${(i % 10) + 1}`,
      status: 'planned',
      completedAt: null,
      resultNotes: null,
      outcome: null,
      createdAt: iso(60 * 24 * (30 - i)),
    });
  }
}
seedFup();

const VALID_TYPES: PlanType[] = ['post_discharge', 'chronic_disease', 'oncology', 'maternity'];
const VALID_OUTCOMES: Outcome[] = ['recovered', 'improved', 'unchanged', 'deteriorated', 'dead'];

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` }],
    },
    404,
  );
}

function withOverdue(r: FupRecord): FupRecord {
  const now = Date.now();
  const nextMs = Date.parse(r.nextFollowUpDate);
  return {
    ...r,
    overdue: r.status === 'planned' && Number.isFinite(nextMs) && nextMs < now,
  };
}

// ============================== 1. GET /api/v1/follow-up-plans ==============================

async function handleFupList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const status = (c.query.get('status') ?? '').trim();
  let rows = Array.from(fupStore.values()).map(withOverdue);
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (status) rows = rows.filter((r) => r.status === status);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/follow-up-plans ==============================

async function handleFupCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, visitId, planType, nextFollowUpDate, followUpDeptCode, responsibleDoctorId } =
    body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof nextFollowUpDate !== 'string' || !nextFollowUpDate.trim() ||
    typeof followUpDeptCode !== 'string' || !followUpDeptCode.trim() ||
    typeof responsibleDoctorId !== 'string' || !responsibleDoctorId.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof planType !== 'string' || !VALID_TYPES.includes(planType as PlanType)) {
    return json({ code: 400, message: 'invalid_plan_type' }, 400);
  }

  const rec = addFup({
    patientId: patientId.trim(),
    visitId: visitId.trim(),
    planType: planType as PlanType,
    nextFollowUpDate: nextFollowUpDate.trim(),
    followUpDeptCode: followUpDeptCode.trim(),
    responsibleDoctorId: responsibleDoctorId.trim(),
    status: 'planned',
    completedAt: null,
    resultNotes: null,
    outcome: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/follow-up-plans/:id/complete ==============================

async function handleFupComplete(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = fupStore.get(id);
  if (!rec) return notFound('FollowUpPlan', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  const resultNotes = body && typeof body.resultNotes === 'string' ? body.resultNotes.trim() : null;
  const outcome = body && typeof body.outcome === 'string' && VALID_OUTCOMES.includes(body.outcome as Outcome)
    ? (body.outcome as Outcome)
    : null;

  if (rec.status === 'completed' || rec.status === 'cancelled') {
    return json({ code: 409, message: 'already_completed' }, 409);
  }
  rec.status = 'completed';
  rec.completedAt = new Date().toISOString();
  rec.resultNotes = resultNotes;
  rec.outcome = outcome;
  rec.overdue = false;
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/follow-up-plans/:id/reschedule ==============================

async function handleFupReschedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = fupStore.get(id);
  if (!rec) return notFound('FollowUpPlan', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body || typeof body.newDate !== 'string' || !body.newDate.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  if (rec.status === 'completed' || rec.status === 'cancelled') {
    return json({ code: 409, message: 'cannot_reschedule_completed' }, 409);
  }
  rec.nextFollowUpDate = body.newDate.trim();
  rec.overdue = false;
  return json(ok(rec), 200);
}

export const m590Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/follow-up-plans', handle: handleFupList, auth: true },
  { method: 'POST', path: '/api/v1/follow-up-plans', handle: handleFupCreate, auth: true },
  { method: 'POST', path: '/api/v1/follow-up-plans/:id/complete', handle: handleFupComplete, auth: true },
  { method: 'POST', path: '/api/v1/follow-up-plans/:id/reschedule', handle: handleFupReschedule, auth: true },
];
