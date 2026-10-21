/**
 * 健澜科技 jlmedaios - M537 新标准 P0：肿瘤随访路由 2 端点（修正契约）
 *
 * GET  /api/v1/oncology/followups?patientId=   列表（followedUpAt 倒序）
 * POST /api/v1/oncology/followups               新建
 *
 * 后端二次校验：tnmStage==='IV' 且 now 距 nextTreatmentAt 超过 30 天 → needsUrgentReview=true；否则 false。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M536 /psych/screens、M535 /chronic/followups、M534 /trauma/niss 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type TumorType = 'lung' | 'breast' | 'colorectal' | 'gastric' | 'liver' | 'other';
type TnmStage = 'I' | 'II' | 'III' | 'IV';
type TreatmentPhase = 'surgery' | 'chemo' | 'radio' | 'targeted' | 'immunotherapy' | 'palliative';

interface OncologyFollowupRecord {
  id: string;
  patientId: string;
  tumorType: TumorType;
  tnmStage: TnmStage;
  treatmentPhase: TreatmentPhase;
  lastTreatmentAt: string;
  nextTreatmentAt: string;
  cea: number | null;
  ct_score: number | null;
  notes: string | null;
  needsUrgentReview: boolean;
  followedUpAt: string;
}

const TUMORS: TumorType[] = ['lung', 'breast', 'colorectal', 'gastric', 'liver', 'other'];
const STAGES: TnmStage[] = ['I', 'II', 'III', 'IV'];
const PHASES: TreatmentPhase[] = ['surgery', 'chemo', 'radio', 'targeted', 'immunotherapy', 'palliative'];

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const oncStore = new Map<string, OncologyFollowupRecord>();
let oncSeq = 4;

function isUrgent(nowMs: number, tnmStage: TnmStage, nextTreatmentAt: string): boolean {
  if (tnmStage !== 'IV') return false;
  const next = Date.parse(nextTreatmentAt);
  if (Number.isNaN(next)) return false;
  return nowMs - next > 30 * 86_400_000;
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const nextIso = (offsetDays: number): string => new Date(t0 + offsetDays * 86_400_000).toISOString();
  const pastIso = (offsetDays: number): string => new Date(t0 - offsetDays * 86_400_000).toISOString();
  const seeds: OncologyFollowupRecord[] = [
    {
      id: 'ONC-001', patientId: 'P10001', tumorType: 'colorectal', tnmStage: 'IV',
      treatmentPhase: 'chemo', lastTreatmentAt: pastIso(40), nextTreatmentAt: pastIso(35),
      cea: 18.6, ct_score: 4.2, notes: 'FOLFOX+贝伐，周期已超期',
      needsUrgentReview: true, followedUpAt: iso(60),
    },
    {
      id: 'ONC-002', patientId: 'P10002', tumorType: 'lung', tnmStage: 'IV',
      treatmentPhase: 'immunotherapy', lastTreatmentAt: iso(0), nextTreatmentAt: nextIso(10),
      cea: null, ct_score: null, notes: '免疫治疗周期内',
      needsUrgentReview: false, followedUpAt: iso(120),
    },
    {
      id: 'ONC-003', patientId: 'P10003', tumorType: 'breast', tnmStage: 'II',
      treatmentPhase: 'surgery', lastTreatmentAt: pastIso(120), nextTreatmentAt: nextIso(180),
      cea: null, ct_score: null, notes: '术后定期复查',
      needsUrgentReview: false, followedUpAt: iso(180),
    },
    {
      id: 'ONC-004', patientId: 'P10004', tumorType: 'gastric', tnmStage: 'III',
      treatmentPhase: 'targeted', lastTreatmentAt: pastIso(15), nextTreatmentAt: nextIso(15),
      cea: 6.8, ct_score: 1.1, notes: null,
      needsUrgentReview: false, followedUpAt: iso(240),
    },
  ];
  seeds.forEach((r) => oncStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/oncology/followups 列表 ==============================

async function handleOncList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  let items = Array.from(oncStore.values());
  if (patientId) items = items.filter((r) => r.patientId === patientId);
  items = items.slice().sort((a, b) => b.followedUpAt.localeCompare(a.followedUpAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/oncology/followups 新建 ==============================

async function handleOncCreate(c: Ctx): Promise<Response> {
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
  const tumorType = body.tumorType;
  const tnmStage = body.tnmStage;
  const treatmentPhase = body.treatmentPhase;
  const lastTreatmentAt = body.lastTreatmentAt;
  const nextTreatmentAt = body.nextTreatmentAt;
  const notes = body.notes;

  const nullableNum = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const cea = nullableNum(body.cea);
  const ctScore = nullableNum(body.ct_score);

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    (typeof tumorType !== 'string' || !TUMORS.includes(tumorType as TumorType)) ||
    (typeof tnmStage !== 'string' || !STAGES.includes(tnmStage as TnmStage)) ||
    (typeof treatmentPhase !== 'string' || !PHASES.includes(treatmentPhase as TreatmentPhase)) ||
    typeof lastTreatmentAt !== 'string' || !lastTreatmentAt.trim() ||
    typeof nextTreatmentAt !== 'string' || !nextTreatmentAt.trim() ||
    (body.cea != null && body.cea !== undefined && cea == null) ||
    (body.ct_score != null && body.ct_score !== undefined && ctScore == null) ||
    (notes != null && typeof notes !== 'string')
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const nowMs = Date.now();
  const record: OncologyFollowupRecord = {
    id: `ONC-${String(oncSeq + 1).padStart(3, '0')}`,
    patientId: patientId.trim(),
    tumorType: tumorType as TumorType,
    tnmStage: tnmStage as TnmStage,
    treatmentPhase: treatmentPhase as TreatmentPhase,
    lastTreatmentAt: lastTreatmentAt.trim(),
    nextTreatmentAt: nextTreatmentAt.trim(),
    cea,
    ct_score: ctScore,
    notes: notes == null || !notes.trim() ? null : (notes as string).trim(),
    needsUrgentReview: isUrgent(nowMs, tnmStage as TnmStage, nextTreatmentAt.trim()),
    followedUpAt: new Date(nowMs).toISOString(),
  };
  oncSeq += 1;
  oncStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m537Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/oncology/followups', handle: handleOncList, auth: true },
  { method: 'POST', path: '/api/v1/oncology/followups', handle: handleOncCreate, auth: true },
];
