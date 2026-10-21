/**
 * 健澜科技 jlmedaios - M535 新标准 P0：慢病随访路由 2 端点
 *
 * GET  /api/v1/chronic/followups?patientId=   列表（followedUpAt 倒序）
 * POST /api/v1/chronic/followups              新建（后端按疾病类型判定 uncontrolled 与 needsPhysicianReview）
 *
 * 判定规则冻结：
 *   hypertension：sbp>=180 || dbp>=110 → uncontrolled
 *   diabetes：ach1c>9 → uncontrolled
 *   coronary/copd/stroke：medicationAdherence==='no' → uncontrolled
 *   uncontrolled → needsPhysicianReview=true，否则 false。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M534 /trauma/niss、M533 /er-triages、M532 /barthel-scores 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DiseaseCode = 'hypertension' | 'diabetes' | 'coronary' | 'copd' | 'stroke';
type Adherence = 'yes' | 'partial' | 'no';

interface ChronicFollowupRecord {
  id: string;
  patientId: string;
  diseaseCode: DiseaseCode;
  sbp: number;
  dbp: number;
  heartRate: number;
  weight: number;
  bmi: number;
  ach1c: number | null;
  fastingGlucose: number | null;
  medicationAdherence: Adherence;
  uncontrolled: boolean;
  needsPhysicianReview: boolean;
  nextFollowUpAt: string;
  notes: string | null;
  followedUpAt: string;
}

const DISEASES: DiseaseCode[] = ['hypertension', 'diabetes', 'coronary', 'copd', 'stroke'];
const ADHERENCES: Adherence[] = ['yes', 'partial', 'no'];

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const cfuStore = new Map<string, ChronicFollowupRecord>();
let cfuSeq = 4;

function isUncontrolled(
  diseaseCode: DiseaseCode,
  sbp: number,
  dbp: number,
  ach1c: number | null,
  adherence: Adherence,
): boolean {
  if (diseaseCode === 'hypertension') return sbp >= 180 || dbp >= 110;
  if (diseaseCode === 'diabetes') return ach1c != null && ach1c > 9;
  return adherence === 'no';
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const nextIso = (offsetDays: number): string => new Date(t0 + offsetDays * 86_400_000).toISOString();
  const seeds: ChronicFollowupRecord[] = [
    {
      id: 'CFU-001', patientId: 'P10001', diseaseCode: 'hypertension',
      sbp: 185, dbp: 112, heartRate: 88, weight: 78, bmi: 26.4,
      ach1c: null, fastingGlucose: null, medicationAdherence: 'partial',
      uncontrolled: true, needsPhysicianReview: true,
      nextFollowUpAt: nextIso(7), notes: '血压未达标，建议调整降压方案', followedUpAt: iso(60),
    },
    {
      id: 'CFU-002', patientId: 'P10002', diseaseCode: 'diabetes',
      sbp: 128, dbp: 78, heartRate: 76, weight: 70, bmi: 24.1,
      ach1c: 9.5, fastingGlucose: 9.8, medicationAdherence: 'yes',
      uncontrolled: true, needsPhysicianReview: true,
      nextFollowUpAt: nextIso(14), notes: '糖化血红蛋白偏高', followedUpAt: iso(120),
    },
    {
      id: 'CFU-003', patientId: 'P10003', diseaseCode: 'hypertension',
      sbp: 132, dbp: 82, heartRate: 72, weight: 72, bmi: 23.6,
      ach1c: null, fastingGlucose: null, medicationAdherence: 'yes',
      uncontrolled: false, needsPhysicianReview: false,
      nextFollowUpAt: nextIso(30), notes: null, followedUpAt: iso(180),
    },
    {
      id: 'CFU-004', patientId: 'P10004', diseaseCode: 'coronary',
      sbp: 126, dbp: 76, heartRate: 70, weight: 68, bmi: 22.8,
      ach1c: 5.8, fastingGlucose: 5.6, medicationAdherence: 'yes',
      uncontrolled: false, needsPhysicianReview: false,
      nextFollowUpAt: nextIso(30), notes: '无心绞痛发作', followedUpAt: iso(240),
    },
  ];
  seeds.forEach((r) => cfuStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/chronic/followups 列表 ==============================

async function handleCfuList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  let items = Array.from(cfuStore.values());
  if (patientId) items = items.filter((r) => r.patientId === patientId);
  items = items.slice().sort((a, b) => b.followedUpAt.localeCompare(a.followedUpAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/chronic/followups 新建 ==============================

async function handleCfuCreate(c: Ctx): Promise<Response> {
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
  const diseaseCode = body.diseaseCode;
  const medicationAdherence = body.medicationAdherence;
  const nextFollowUpAt = body.nextFollowUpAt;
  const notes = body.notes;

  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  const nullableNum = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };

  const sbp = num(body.sbp);
  const dbp = num(body.dbp);
  const heartRate = num(body.heartRate);
  const weight = num(body.weight);
  const bmi = num(body.bmi);
  const ach1c = nullableNum(body.ach1c);
  const fastingGlucose = nullableNum(body.fastingGlucose);

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof diseaseCode !== 'string' || !DISEASES.includes(diseaseCode as DiseaseCode) ||
    typeof medicationAdherence !== 'string' || !ADHERENCES.includes(medicationAdherence as Adherence) ||
    typeof nextFollowUpAt !== 'string' || !nextFollowUpAt.trim() ||
    sbp == null || dbp == null || heartRate == null || weight == null || bmi == null ||
    (notes != null && typeof notes !== 'string')
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const uncontrolled = isUncontrolled(
    diseaseCode as DiseaseCode, sbp, dbp, ach1c, medicationAdherence as Adherence,
  );

  cfuSeq += 1;
  const record: ChronicFollowupRecord = {
    id: `CFU-${String(cfuSeq).padStart(3, '0')}`,
    patientId: patientId.trim(),
    diseaseCode: diseaseCode as DiseaseCode,
    sbp,
    dbp,
    heartRate,
    weight,
    bmi,
    ach1c,
    fastingGlucose,
    medicationAdherence: medicationAdherence as Adherence,
    uncontrolled,
    needsPhysicianReview: uncontrolled,
    nextFollowUpAt: nextFollowUpAt.trim(),
    notes: notes == null || !notes.trim() ? null : (notes as string).trim(),
    followedUpAt: new Date().toISOString(),
  };
  cfuStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m535Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/chronic/followups', handle: handleCfuList, auth: true },
  { method: 'POST', path: '/api/v1/chronic/followups', handle: handleCfuCreate, auth: true },
];
