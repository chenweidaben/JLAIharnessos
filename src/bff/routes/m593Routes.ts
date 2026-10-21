/**
 * 健澜科技 jlmedaios - M593 新标准 P12：康复评估 4 端点
 *
 * GET    /api/v1/rehab-assessments?patientId=&phase=   列表（assessedAt 倒序）
 * POST   /api/v1/rehab-assessments                     新建评估（score 范围匹配 + assessedAt 不能未来）
 * POST   /api/v1/rehab-assessments/:id/goal            康复目标
 * POST   /api/v1/rehab-assessments/:id/progress        进度记录（progressScore 范围匹配同 POST 规则）
 *
 * 种子 20 条：含 8 条目标（goal 非空）、12 条进度（progress 数组非空）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type AssessmentType = 'barthel' | 'fugl-meyer' | '6-minute-walk' | 'berg' | 'vas';

interface Goal {
  targetScore: number | null;
  targetDate: string | null;
  goalNotes: string | null;
  createdBy: string | null;
}

interface Progress {
  progressDate: string;
  progressScore: number;
  progressNotes: string;
  therapistId: string;
}

interface RaRecord {
  id: string;
  patientId: string;
  assessmentType: AssessmentType;
  score: number;
  assessedBy: string;
  assessedAt: string;
  notes: string;
  goal: Goal;
  progress: Progress[];
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const raStore = new Map<string, RaRecord>();
let raSeq = 0;

function addRa(r: Omit<RaRecord, 'id'>): RaRecord {
  raSeq += 1;
  const rec: RaRecord = { ...r, id: `RA-${String(raSeq).padStart(3, '0')}` };
  raStore.set(rec.id, rec);
  return rec;
}

function scoreRange(t: AssessmentType): { min: number; max: number } {
  switch (t) {
    case 'vas': return { min: 0, max: 10 };
    case 'barthel': return { min: 0, max: 100 };
    case 'berg': return { min: 0, max: 56 };
    case 'fugl-meyer': return { min: 0, max: 100 };
    case '6-minute-walk': return { min: 0, max: 1000 };
  }
}

function scoreValid(t: AssessmentType, s: number): boolean {
  const r = scoreRange(t);
  return s >= r.min && s <= r.max;
}

function seedRa(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const types: AssessmentType[] = ['barthel', 'fugl-meyer', '6-minute-walk', 'berg', 'vas'];
  const scores: Record<AssessmentType, number> = {
    vas: 5, barthel: 80, berg: 40, 'fugl-meyer': 60, '6-minute-walk': 300,
  };

  for (let i = 1; i <= 20; i++) {
    const t = types[i % 5];
    const hasGoal = i <= 8;
    const hasProgress = i <= 12;
    addRa({
      patientId: `P-R${String(i).padStart(3, '0')}`,
      assessmentType: t,
      score: scores[t],
      assessedBy: `DOC-RA-${(i % 10) + 1}`,
      assessedAt: iso(60 * 24 * (30 - i)),
      notes: `评估${i}`,
      goal: hasGoal ? {
        targetScore: scores[t] + 10,
        targetDate: iso(-60 * 24 * 30),
        goalNotes: `目标${i}`,
        createdBy: `DOC-RA-${(i % 10) + 1}`,
      } : { targetScore: null, targetDate: null, goalNotes: null, createdBy: null },
      progress: hasProgress ? [{
        progressDate: iso(60 * 24 * (30 - i) - 120),
        progressScore: scores[t] - 5,
        progressNotes: `进度${i}`,
        therapistId: `THER-${(i % 5) + 1}`,
      }] : [],
      createdAt: iso(60 * 24 * (30 - i)),
    });
  }
}
seedRa();

const VALID_TYPES: AssessmentType[] = ['barthel', 'fugl-meyer', '6-minute-walk', 'berg', 'vas'];

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` }],
    },
    404,
  );
}

// ============================== 1. GET /api/v1/rehab-assessments ==============================

async function handleRaList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  let rows = Array.from(raStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  rows = rows.sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/rehab-assessments ==============================

async function handleRaCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, assessmentType, score, assessedBy, notes, assessedAt } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof score !== 'number' ||
    typeof assessedBy !== 'string' || !assessedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof assessmentType !== 'string' || !VALID_TYPES.includes(assessmentType as AssessmentType)) {
    return json({ code: 400, message: 'invalid_assessment_type' }, 400);
  }

  const t = assessmentType as AssessmentType;
  if (!scoreValid(t, score)) {
    return json({ code: 400, message: 'score_out_of_range_for_type' }, 400);
  }

  // assessedAt 不能未来
  const assessedMs = typeof assessedAt === 'string' ? Date.parse(assessedAt) : NaN;
  if (Number.isFinite(assessedMs) && assessedMs > Date.now()) {
    return json({ code: 400, message: 'assessed_date_cannot_be_future' }, 400);
  }

  const now = new Date().toISOString();
  const rec = addRa({
    patientId: patientId.trim(),
    assessmentType: t,
    score,
    assessedBy: assessedBy.trim(),
    assessedAt: Number.isFinite(assessedMs) ? (assessedAt as string) : now,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : '',
    goal: { targetScore: null, targetDate: null, goalNotes: null, createdBy: null },
    progress: [],
    createdAt: now,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/rehab-assessments/:id/goal ==============================

async function handleRaGoal(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = raStore.get(id);
  if (!rec) return notFound('RehabAssessment', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  rec.goal = {
    targetScore: typeof body.targetScore === 'number' ? body.targetScore : null,
    targetDate: typeof body.targetDate === 'string' && body.targetDate.trim() ? body.targetDate.trim() : null,
    goalNotes: typeof body.goalNotes === 'string' && body.goalNotes.trim() ? body.goalNotes.trim() : null,
    createdBy: typeof body.createdBy === 'string' && body.createdBy.trim() ? body.createdBy.trim() : null,
  };
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/rehab-assessments/:id/progress ==============================

async function handleRaProgress(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = raStore.get(id);
  if (!rec) return notFound('RehabAssessment', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { progressDate, progressScore, progressNotes, therapistId } = body as Record<string, unknown>;
  if (
    typeof progressDate !== 'string' || !progressDate.trim() ||
    typeof progressScore !== 'number' ||
    typeof therapistId !== 'string' || !therapistId.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // progressScore 范围匹配 assessmentType
  if (!scoreValid(rec.assessmentType, progressScore)) {
    return json({ code: 400, message: 'score_out_of_range_for_type' }, 400);
  }

  rec.progress.push({
    progressDate: progressDate.trim(),
    progressScore,
    progressNotes: typeof progressNotes === 'string' && progressNotes.trim() ? progressNotes.trim() : '',
    therapistId: therapistId.trim(),
  });
  return json(ok(rec), 200);
}

export const m593Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/rehab-assessments', handle: handleRaList, auth: true },
  { method: 'POST', path: '/api/v1/rehab-assessments', handle: handleRaCreate, auth: true },
  { method: 'POST', path: '/api/v1/rehab-assessments/:id/goal', handle: handleRaGoal, auth: true },
  { method: 'POST', path: '/api/v1/rehab-assessments/:id/progress', handle: handleRaProgress, auth: true },
];
