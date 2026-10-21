/**
 * 健澜科技 jlmedaios - M562 新标准 P5：临床路径管理闭环 4 端点
 *
 * GET  /api/v1/clinical-paths?deptCode=&diseaseCode=       路径目录列表
 * GET  /api/v1/clinical-paths/:id/stages                   单路径 5 阶段详情
 * POST /api/v1/clinical-path-enrollments                  患者入径（同患者同路径重复 409 already_enrolled）
 * POST /api/v1/clinical-path-enrollments/:id/complete     出径（重复 409 already_completed；deviated/dropped 必配 deviationReason 否则 400）
 *
 * 种子：6 路径（P01~P06，internal/surgery/cardiology/pediatrics）× 5 阶段；10 入径（3 completed + 7 enrolled）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Stage = 'admission_assessment' | 'pre_op_prep' | 'surgery' | 'post_op_observation' | 'discharge_guidance';
const STAGES: Stage[] = ['admission_assessment', 'pre_op_prep', 'surgery', 'post_op_observation', 'discharge_guidance'];

type EnrollStatus = 'enrolled' | 'completed';
type Outcome = 'normal' | 'deviated' | 'dropped';

interface PathRecord {
  id: string;
  diseaseCode: string;
  diseaseName: string;
  deptCode: string;
  expectedDays: number;
  stages: Stage[];
}

interface EnrollRecord {
  id: string;
  patientId: string;
  pathId: string;
  enrollDate: string;
  expectedDays: number;
  status: EnrollStatus;
  outcome: Outcome | null;
  deviationReason: string | null;
  completedAt: string | null;
}

// ============================== 内存态库（DEMO 短路） ==============================

const pathStore = new Map<string, PathRecord>();
const enrStore = new Map<string, EnrollRecord>();
let enrSeq = 0;

function seedPaths(): void {
  const rows: Array<Omit<PathRecord, 'id'>> = [
    { diseaseCode: 'K35', diseaseName: '急性阑尾炎', deptCode: 'surgery', expectedDays: 7, stages: [...STAGES] },
    { diseaseCode: 'I21', diseaseName: '急性 ST 段抬高心梗', deptCode: 'cardiology', expectedDays: 10, stages: [...STAGES] },
    { diseaseCode: 'J18', diseaseName: '社区获得性肺炎', deptCode: 'internal', expectedDays: 8, stages: [...STAGES] },
    { diseaseCode: 'K80', diseaseName: '胆囊结石伴胆囊炎', deptCode: 'surgery', expectedDays: 9, stages: [...STAGES] },
    { diseaseCode: 'E11', diseaseName: '2 型糖尿病', deptCode: 'endocrinology', expectedDays: 6, stages: [...STAGES] },
    { diseaseCode: 'J18.9', diseaseName: '小儿支气管肺炎', deptCode: 'pediatrics', expectedDays: 7, stages: [...STAGES] },
  ];
  rows.forEach((r, i) => {
    const id = `PATH-P${String(i + 1).padStart(2, '0')}`;
    pathStore.set(id, { ...r, id });
  });
}

function addEnr(r: Omit<EnrollRecord, 'id'>): EnrollRecord {
  enrSeq += 1;
  const rec: EnrollRecord = { ...r, id: `ENR-${String(enrSeq).padStart(3, '0')}` };
  enrStore.set(rec.id, rec);
  return rec;
}

function seedEnrollments(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 3 已 completed
  addEnr({ patientId: 'P-C001', pathId: 'PATH-P01', enrollDate: iso(60 * 24 * 10), expectedDays: 7, status: 'completed', outcome: 'normal', deviationReason: null, completedAt: iso(60 * 24 * 3) });
  addEnr({ patientId: 'P-C002', pathId: 'PATH-P02', enrollDate: iso(60 * 24 * 12), expectedDays: 10, status: 'completed', outcome: 'deviated', deviationReason: '术中出现并发症转 ICU', completedAt: iso(60 * 24 * 4) });
  addEnr({ patientId: 'P-C003', pathId: 'PATH-P03', enrollDate: iso(60 * 24 * 8), expectedDays: 8, status: 'completed', outcome: 'dropped', deviationReason: '患者自动出院', completedAt: iso(60 * 24 * 2) });

  // 7 enrolled
  addEnr({ patientId: 'P-E001', pathId: 'PATH-P01', enrollDate: iso(60 * 24 * 1), expectedDays: 7, status: 'enrolled', outcome: null, deviationReason: null, completedAt: null });
  addEnr({ patientId: 'P-E002', pathId: 'PATH-P04', enrollDate: iso(60 * 12), expectedDays: 9, status: 'enrolled', outcome: null, deviationReason: null, completedAt: null });
  addEnr({ patientId: 'P-E003', pathId: 'PATH-P02', enrollDate: iso(60 * 8), expectedDays: 10, status: 'enrolled', outcome: null, deviationReason: null, completedAt: null });
  addEnr({ patientId: 'P-E004', pathId: 'PATH-P03', enrollDate: iso(60 * 6), expectedDays: 8, status: 'enrolled', outcome: null, deviationReason: null, completedAt: null });
  addEnr({ patientId: 'P-E005', pathId: 'PATH-P05', enrollDate: iso(60 * 4), expectedDays: 6, status: 'enrolled', outcome: null, deviationReason: null, completedAt: null });
  addEnr({ patientId: 'P-E006', pathId: 'PATH-P06', enrollDate: iso(60 * 2), expectedDays: 7, status: 'enrolled', outcome: null, deviationReason: null, completedAt: null });
  addEnr({ patientId: 'P-E007', pathId: 'PATH-P04', enrollDate: iso(60), expectedDays: 9, status: 'enrolled', outcome: null, deviationReason: null, completedAt: null });
}

seedPaths();
seedEnrollments();

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

// ============================== 1. GET /api/v1/clinical-paths ==============================

async function handlePathList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  const diseaseCode = (c.query.get('diseaseCode') ?? '').trim();

  let rows = Array.from(pathStore.values());
  if (deptCode) rows = rows.filter((r) => r.deptCode === deptCode);
  if (diseaseCode) rows = rows.filter((r) => r.diseaseCode === diseaseCode);
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. GET /api/v1/clinical-paths/:id/stages ==============================

async function handlePathStages(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = pathStore.get(id);
  if (!rec) return notFound('ClinicalPath', id);
  return json(ok({ id: rec.id, diseaseCode: rec.diseaseCode, diseaseName: rec.diseaseName, stages: rec.stages }), 200);
}

// ============================== 3. POST /api/v1/clinical-path-enrollments ==============================

async function handleEnrCreate(c: Ctx): Promise<Response> {
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
  const pathId = body.pathId;
  const enrollDate = body.enrollDate;
  const expectedDays = body.expectedDays;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof pathId !== 'string' || !pathId.trim() ||
    typeof enrollDate !== 'string' || !enrollDate.trim() ||
    typeof expectedDays !== 'number' || !Number.isFinite(expectedDays) || expectedDays <= 0
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // 同 patientId 同 pathId 已有 enrolled 状态入径 → 409
  const dup = Array.from(enrStore.values()).some(
    (r) => r.patientId === patientId.trim() && r.pathId === pathId.trim() && r.status === 'enrolled',
  );
  if (dup) return json({ code: 409, message: 'already_enrolled' }, 409);

  const rec = addEnr({
    patientId: patientId.trim(),
    pathId: pathId.trim(),
    enrollDate: enrollDate.trim(),
    expectedDays,
    status: 'enrolled',
    outcome: null,
    deviationReason: null,
    completedAt: null,
  });
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/clinical-path-enrollments/:id/complete ==============================

async function handleEnrComplete(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = enrStore.get(id);
  if (!rec) return notFound('ClinicalPathEnrollment', id);

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

  const outcome = body.outcome;
  const deviationReason = body.deviationReason;

  const OUTCOMES: Outcome[] = ['normal', 'deviated', 'dropped'];
  if (typeof outcome !== 'string' || !OUTCOMES.includes(outcome as Outcome)) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // deviated/dropped 必须配 deviationReason
  if ((outcome === 'deviated' || outcome === 'dropped') &&
      (typeof deviationReason !== 'string' || !deviationReason.trim())) {
    return json({ code: 400, message: 'deviation_reason_required' }, 400);
  }

  rec.status = 'completed';
  rec.outcome = outcome as Outcome;
  rec.deviationReason = typeof deviationReason === 'string' ? deviationReason.trim() : null;
  rec.completedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m562Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/clinical-paths', handle: handlePathList, auth: true },
  { method: 'GET', path: '/api/v1/clinical-paths/:id/stages', handle: handlePathStages, auth: true },
  { method: 'POST', path: '/api/v1/clinical-path-enrollments', handle: handleEnrCreate, auth: true },
  { method: 'POST', path: '/api/v1/clinical-path-enrollments/:id/complete', handle: handleEnrComplete, auth: true },
];
