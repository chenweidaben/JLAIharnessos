/**
 * 健澜科技 jlmedaios - M574 新标准 P8：入院记录 3 端点
 *
 * GET  /api/v1/admission-records?patientId=&admissionDate=   列表（creatingAt 倒序；过滤）
 * POST /api/v1/admission-records                            新建草稿（status=draft）
 * POST /api/v1/admission-records/:id/submit                 上级医师审签（单次 submit 直接置 reviewed；已 reviewed 409 already_reviewed；未 draft 重复提交 409 already_submitted）
 *
 * 种子 10 份：internal/surgery/pediatrics 三科；draft/submitted/reviewed 三态覆盖。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type AdmStatus = 'draft' | 'submitted' | 'reviewed';
type ReviewResult = 'approve' | 'revise';

interface Vitals {
  bp: string;
  hr: number;
  temp: number;
  spo2: number;
  respiration: number;
}

interface AdmRecord {
  id: string;
  patientId: string;
  visitId: string;
  admissionDate: string;
  mainChiefComplaint: string;
  presentIllnessHistory: string;
  pastHistory: string;
  personalHistory: string;
  familyHistory: string;
  physicalExamination: Vitals;
  admissionDiagnosis: string;
  creatingDoctor: string;
  creatingAt: string;
  status: AdmStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewResult: ReviewResult | null;
}

// ============================== 内存态库（DEMO 短路） ==============================

const admStore = new Map<string, AdmRecord>();
let admSeq = 0;

function addAdm(r: Omit<AdmRecord, 'id'>): AdmRecord {
  admSeq += 1;
  const rec: AdmRecord = { ...r, id: `ADM-${String(admSeq).padStart(3, '0')}` };
  admStore.set(rec.id, rec);
  return rec;
}

function seedAdm(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  const vitals: Vitals = { bp: '120/80', hr: 76, temp: 36.8, spo2: 98, respiration: 18 };

  // 4 draft
  for (let i = 1; i <= 4; i++) {
    addAdm({
      patientId: `P-A${String(i).padStart(3, '0')}`,
      visitId: `V-${String(i).padStart(3, '0')}`,
      admissionDate: iso(60 * 24 * (10 - i)),
      mainChiefComplaint: '发热 3 天',
      presentIllnessHistory: '患者 3 天前无明显诱因出现发热...',
      pastHistory: '既往体健',
      personalHistory: '无烟酒嗜好',
      familyHistory: '无家族遗传病史',
      physicalExamination: vitals,
      admissionDiagnosis: i % 3 === 0 ? '急性阑尾炎' : i % 3 === 1 ? '社区获得性肺炎' : '小儿腹泻',
      creatingDoctor: `DOC-${i}`,
      creatingAt: iso(60 * 24 * (10 - i)),
      status: 'draft',
      reviewedBy: null,
      reviewedAt: null,
      reviewResult: null,
    });
  }

  // 3 submitted（已提交但待审签）
  for (let i = 5; i <= 7; i++) {
    addAdm({
      patientId: `P-A${String(i).padStart(3, '0')}`,
      visitId: `V-${String(i).padStart(3, '0')}`,
      admissionDate: iso(60 * 24 * (10 - i)),
      mainChiefComplaint: '胸痛 2 小时',
      presentIllnessHistory: '患者 2 小时前突发心前区压榨样疼痛...',
      pastHistory: '高血压 5 年',
      personalHistory: '吸烟 20 年',
      familyHistory: '父亲冠心病',
      physicalExamination: vitals,
      admissionDiagnosis: '急性冠脉综合征',
      creatingDoctor: `DOC-${i}`,
      creatingAt: iso(60 * 24 * (10 - i)),
      status: 'submitted',
      reviewedBy: null,
      reviewedAt: null,
      reviewResult: null,
    });
  }

  // 3 reviewed（已审签）
  for (let i = 8; i <= 10; i++) {
    addAdm({
      patientId: `P-A${String(i).padStart(3, '0')}`,
      visitId: `V-${String(i).padStart(3, '0')}`,
      admissionDate: iso(60 * 24 * (10 - i)),
      mainChiefComplaint: '腹痛 1 天',
      presentIllnessHistory: '患者 1 天前出现转移性右下腹痛...',
      pastHistory: '既往体健',
      personalHistory: '无特殊',
      familyHistory: '无特殊',
      physicalExamination: vitals,
      admissionDiagnosis: '急性阑尾炎',
      creatingDoctor: `DOC-${i}`,
      creatingAt: iso(60 * 24 * (10 - i)),
      status: 'reviewed',
      reviewedBy: `CHIEF-DOC-${i}`,
      reviewedAt: iso(60 * 24 * (10 - i) - 60),
      reviewResult: 'approve',
    });
  }
}
seedAdm();

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

// ============================== 1. GET /api/v1/admission-records ==============================

async function handleAdmList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const admissionDate = (c.query.get('admissionDate') ?? '').trim();

  let rows = Array.from(admStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (admissionDate) rows = rows.filter((r) => r.admissionDate.startsWith(admissionDate));
  rows = rows.sort((a, b) => b.creatingAt.localeCompare(a.creatingAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/admission-records ==============================

async function handleAdmCreate(c: Ctx): Promise<Response> {
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
    patientId, visitId, admissionDate, mainChiefComplaint, presentIllnessHistory,
    pastHistory, personalHistory, familyHistory, physicalExamination, admissionDiagnosis, creatingDoctor,
  } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof admissionDate !== 'string' || !admissionDate.trim() ||
    typeof mainChiefComplaint !== 'string' || !mainChiefComplaint.trim() ||
    typeof presentIllnessHistory !== 'string' || !presentIllnessHistory.trim() ||
    typeof pastHistory !== 'string' || !pastHistory.trim() ||
    typeof personalHistory !== 'string' || !personalHistory.trim() ||
    typeof familyHistory !== 'string' || !familyHistory.trim() ||
    typeof admissionDiagnosis !== 'string' || !admissionDiagnosis.trim() ||
    typeof creatingDoctor !== 'string' || !creatingDoctor.trim() ||
    !physicalExamination || typeof physicalExamination !== 'object'
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const pe = physicalExamination as Record<string, unknown>;
  const vitals: Vitals = {
    bp: typeof pe.bp === 'string' ? pe.bp : '0/0',
    hr: typeof pe.hr === 'number' ? pe.hr : 0,
    temp: typeof pe.temp === 'number' ? pe.temp : 0,
    spo2: typeof pe.spo2 === 'number' ? pe.spo2 : 0,
    respiration: typeof pe.respiration === 'number' ? pe.respiration : 0,
  };

  const rec = addAdm({
    patientId: patientId.trim(),
    visitId: visitId.trim(),
    admissionDate: admissionDate.trim(),
    mainChiefComplaint: mainChiefComplaint.trim(),
    presentIllnessHistory: presentIllnessHistory.trim(),
    pastHistory: pastHistory.trim(),
    personalHistory: personalHistory.trim(),
    familyHistory: familyHistory.trim(),
    physicalExamination: vitals,
    admissionDiagnosis: admissionDiagnosis.trim(),
    creatingDoctor: creatingDoctor.trim(),
    creatingAt: new Date().toISOString(),
    status: 'draft',
    reviewedBy: null,
    reviewedAt: null,
    reviewResult: null,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/admission-records/:id/submit ==============================

async function handleAdmSubmit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = admStore.get(id);
  if (!rec) return notFound('AdmissionRecord', id);

  if (rec.status === 'reviewed') {
    return json({ code: 409, message: 'already_reviewed' }, 409);
  }
  if (rec.status === 'submitted') {
    return json({ code: 409, message: 'already_submitted' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const reviewedBy = body.reviewedBy;
  const reviewResult = body.reviewResult;

  if (
    typeof reviewedBy !== 'string' || !reviewedBy.trim() ||
    typeof reviewResult !== 'string' || !['approve', 'revise'].includes(reviewResult)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // 单次 submit 直接置 reviewed（上级医师审签完成）
  rec.status = 'reviewed';
  rec.reviewedBy = reviewedBy.trim();
  rec.reviewedAt = new Date().toISOString();
  rec.reviewResult = reviewResult as ReviewResult;
  return json(ok(rec), 200);
}

export const m574Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/admission-records', handle: handleAdmList, auth: true },
  { method: 'POST', path: '/api/v1/admission-records', handle: handleAdmCreate, auth: true },
  { method: 'POST', path: '/api/v1/admission-records/:id/submit', handle: handleAdmSubmit, auth: true },
];
