/**
 * 健澜科技 jlmedaios - M579 新标准 P9：死亡记录 3 端点
 *
 * GET  /api/v1/death-records?patientId=&deathDate=   列表（createdAt 倒序；过滤）
 * POST /api/v1/death-records                       新建（deathDate 不早于 admissionDate + 24h 内完成校验）
 * POST /api/v1/death-records/:id/review             科主任审签（draft→reviewed；重复 409 already_reviewed）
 *
 * 种子 5 例：1 例猝死 + 多器官衰竭/晚期肿瘤等典型死因。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DrStatus = 'draft' | 'reviewed';

interface DrRecord {
  id: string;
  patientId: string;
  admissionDate: string;
  deathDate: string;
  deathCause: string;
  diagnosisBeforeDeath: string;
  diagnosisAfterDeath: string;
  resuscitationMeasures: string;
  attendingDoctor: string;
  recordingDoctor: string;
  status: DrStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const drStore = new Map<string, DrRecord>();
let drSeq = 0;

function addDr(r: Omit<DrRecord, 'id'>): DrRecord {
  drSeq += 1;
  const rec: DrRecord = { ...r, id: `DR-${String(drSeq).padStart(3, '0')}` };
  drStore.set(rec.id, rec);
  return rec;
}

function seedDr(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 5 例种子（种子直接入库，不受 24h POST 校验约束）
  addDr({
    patientId: 'P-D001', admissionDate: iso(60 * 24 * 30), deathDate: iso(60 * 24 * 2),
    deathCause: '急性心肌梗死猝死', diagnosisBeforeDeath: '冠心病', diagnosisAfterDeath: '急性广泛前壁心梗',
    resuscitationMeasures: '胸外按压+电除颤+肾上腺素', attendingDoctor: 'DOC-CARD-001', recordingDoctor: 'DOC-RES-001',
    status: 'reviewed', reviewedBy: 'CHIEF-CARD', reviewedAt: iso(60 * 24 * 1), createdAt: iso(60 * 24 * 2),
  });
  addDr({
    patientId: 'P-D002', admissionDate: iso(60 * 24 * 20), deathDate: iso(60 * 24 * 5),
    deathCause: '多器官功能衰竭', diagnosisBeforeDeath: '重症肺炎', diagnosisAfterDeath: '感染性休克合并 MODS',
    resuscitationMeasures: '呼吸机+CRRT+升压药', attendingDoctor: 'DOC-ICU-001', recordingDoctor: 'DOC-ICU-002',
    status: 'reviewed', reviewedBy: 'CHIEF-ICU', reviewedAt: iso(60 * 24 * 4), createdAt: iso(60 * 24 * 5),
  });
  addDr({
    patientId: 'P-D003', admissionDate: iso(60 * 24 * 60), deathDate: iso(60 * 24 * 10),
    deathCause: '晚期肺癌恶病质', diagnosisBeforeDeath: '右肺腺癌 IV 期', diagnosisAfterDeath: '右肺腺癌伴多发转移',
    resuscitationMeasures: '家属放弃有创抢救', attendingDoctor: 'DOC-ONC-001', recordingDoctor: 'DOC-ONC-002',
    status: 'draft', reviewedBy: null, reviewedAt: null, createdAt: iso(60 * 24 * 10),
  });
  addDr({
    patientId: 'P-D004', admissionDate: iso(60 * 24 * 15), deathDate: iso(60 * 24 * 3),
    deathCause: '脑干出血', diagnosisBeforeDeath: '高血压脑出血', diagnosisAfterDeath: '脑干出血伴脑疝',
    resuscitationMeasures: '气管插管+脱水降颅压', attendingDoctor: 'DOC-NEURO-001', recordingDoctor: 'DOC-NEURO-002',
    status: 'draft', reviewedBy: null, reviewedAt: null, createdAt: iso(60 * 24 * 3),
  });
  addDr({
    patientId: 'P-D005', admissionDate: iso(60 * 24 * 10), deathDate: iso(60 * 24 * 1),
    deathCause: '晚期肝硬化消化道出血', diagnosisBeforeDeath: '乙肝肝硬化失代偿', diagnosisAfterDeath: '食管胃底静脉曲张破裂出血',
    resuscitationMeasures: '输血+生长抑素+三腔二囊管', attendingDoctor: 'DOC-GAS-001', recordingDoctor: 'DOC-GAS-002',
    status: 'draft', reviewedBy: null, reviewedAt: null, createdAt: iso(60 * 24 * 1),
  });
}
seedDr();

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

// ============================== 1. GET /api/v1/death-records ==============================

async function handleDrList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const deathDate = (c.query.get('deathDate') ?? '').trim();

  let rows = Array.from(drStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (deathDate) rows = rows.filter((r) => r.deathDate.startsWith(deathDate));
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/death-records ==============================

async function handleDrCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const {
    patientId, admissionDate, deathDate, deathCause, diagnosisBeforeDeath,
    diagnosisAfterDeath, resuscitationMeasures, attendingDoctor, recordingDoctor,
  } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof admissionDate !== 'string' || !admissionDate.trim() ||
    typeof deathDate !== 'string' || !deathDate.trim() ||
    typeof deathCause !== 'string' || !deathCause.trim() ||
    typeof diagnosisBeforeDeath !== 'string' || !diagnosisBeforeDeath.trim() ||
    typeof diagnosisAfterDeath !== 'string' || !diagnosisAfterDeath.trim() ||
    typeof resuscitationMeasures !== 'string' || !resuscitationMeasures.trim() ||
    typeof attendingDoctor !== 'string' || !attendingDoctor.trim() ||
    typeof recordingDoctor !== 'string' || !recordingDoctor.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const admitMs = Date.parse(admissionDate);
  const deathMs = Date.parse(deathDate);
  const nowMs = Date.now();

  // deathDate 不早于 admissionDate
  if (Number.isFinite(admitMs) && Number.isFinite(deathMs) && deathMs < admitMs) {
    return json({ code: 400, message: 'death_before_admission' }, 400);
  }
  // 死亡记录必须在死亡后 24h 内完成
  if (Number.isFinite(deathMs) && (nowMs - deathMs) > 24 * 60 * 60_000) {
    return json({ code: 400, message: 'death_record_must_within_24h' }, 400);
  }

  const rec = addDr({
    patientId: patientId.trim(),
    admissionDate: admissionDate.trim(),
    deathDate: deathDate.trim(),
    deathCause: deathCause.trim(),
    diagnosisBeforeDeath: diagnosisBeforeDeath.trim(),
    diagnosisAfterDeath: diagnosisAfterDeath.trim(),
    resuscitationMeasures: resuscitationMeasures.trim(),
    attendingDoctor: attendingDoctor.trim(),
    recordingDoctor: recordingDoctor.trim(),
    status: 'draft',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/death-records/:id/review ==============================

async function handleDrReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = drStore.get(id);
  if (!rec) return notFound('DeathRecord', id);

  if (rec.status === 'reviewed') {
    return json({ code: 409, message: 'already_reviewed' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const reviewedBy = body.reviewedBy;
  if (typeof reviewedBy !== 'string' || !reviewedBy.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'reviewed';
  rec.reviewedBy = reviewedBy.trim();
  rec.reviewedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m579Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/death-records', handle: handleDrList, auth: true },
  { method: 'POST', path: '/api/v1/death-records', handle: handleDrCreate, auth: true },
  { method: 'POST', path: '/api/v1/death-records/:id/review', handle: handleDrReview, auth: true },
];
