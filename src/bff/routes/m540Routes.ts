/**
 * 健澜科技 jlmedaios - M540 新标准 P0：智能预问诊路由 2 端点（规则引擎）
 *
 * GET  /api/v1/smart-triages?patientId=   列表（triagedAt 倒序）
 * POST /api/v1/smart-triages              新建（后端规则引擎自动算 triageLevel / waitArea / needsUpgrade）
 *
 * 规则引擎冻结：
 *   level1（抢救室 resuscitation）：spo2<90 || gcs<9 || sbp<90
 *   level2（抢救室 resuscitation）：temperature>=39 || pulse>=120（level1 未命中时）
 *   level3（候诊区 waiting）：symptoms 含 chest_pain / abdominal_pain / fracture 等急症关键词
 *                            或未命中 level1/2/4 的兜底
 *   level4（留观区 observation）：轻症感冒 / 腹泻等
 *   needsUpgrade = level1 || level2。
 *   recommendedDeptCode：chiefComplaint 含 chest→cardiology、abdominal→gastroenterology、
 *   fever→internal、trauma/fracture→emergency，default→emergency。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M539 /online-consults、M538 /postpartum/visits 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Gender = 'male' | 'female';
type TriageLevel = 1 | 2 | 3 | 4;
type WaitArea = 'resuscitation' | 'waiting' | 'observation';

interface SmartVitals {
  temperature: number;
  pulse: number;
  sbp: number;
  dbp: number;
  spo2: number;
  gcs: number;
}

interface SmartTriageRecord {
  id: string;
  patientId: string;
  age: number;
  gender: Gender;
  chiefComplaint: string;
  vitals: SmartVitals;
  symptoms: string[];
  triageLevel: TriageLevel;
  recommendedDeptCode: string;
  waitArea: WaitArea;
  needsUpgrade: boolean;
  triagedAt: string;
}

const GENDERS: Gender[] = ['male', 'female'];

const ACUTE_SYMPTOMS = new Set(['chest_pain', 'abdominal_pain', 'fracture', 'trauma', 'dyspnea', 'consciousness_disturbance']);
const MILD_SYMPTOMS = new Set(['cold', 'cough', 'diarrhea', 'mild_fever']);

function recommendedDept(chiefComplaint: string, symptoms: string[]): string {
  const cc = chiefComplaint.toLowerCase();
  if (cc.includes('chest') || symptoms.includes('chest_pain')) return 'cardiology';
  if (cc.includes('abdominal') || symptoms.includes('abdominal_pain')) return 'gastroenterology';
  if (cc.includes('fever') || cc.includes('发热')) return 'internal';
  if (cc.includes('trauma') || cc.includes('fracture') || symptoms.includes('fracture')) return 'emergency';
  return 'emergency';
}

function runRuleEngine(vitals: SmartVitals, chiefComplaint: string, symptoms: string[]): TriageLevel {
  // level1：呼吸/意识/循环危急
  if (vitals.spo2 < 90 || vitals.gcs < 9 || vitals.sbp < 90) return 1;
  // level2：高热/心动过速
  if (vitals.temperature >= 39 || vitals.pulse >= 120) return 2;
  // level4：轻症
  const hasMild = symptoms.some((s) => MILD_SYMPTOMS.has(s));
  const hasAcute = symptoms.some((s) => ACUTE_SYMPTOMS.has(s));
  if (hasMild && !hasAcute) return 4;
  // level3：急症关键词或兜底
  return 3;
}

function waitAreaOf(level: TriageLevel): WaitArea {
  if (level === 1 || level === 2) return 'resuscitation';
  if (level === 3) return 'waiting';
  return 'observation';
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const stStore = new Map<string, SmartTriageRecord>();
let stSeq = 4;

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: SmartTriageRecord[] = [
    {
      id: 'ST-001', patientId: 'P10001', age: 68, gender: 'male', chiefComplaint: 'dyspnea',
      vitals: { temperature: 36.8, pulse: 102, sbp: 130, dbp: 82, spo2: 85, gcs: 15 },
      symptoms: ['dyspnea', 'chest_pain'],
      triageLevel: 1, recommendedDeptCode: 'cardiology', waitArea: 'resuscitation',
      needsUpgrade: true, triagedAt: iso(5),
    },
    {
      id: 'ST-002', patientId: 'P10002', age: 34, gender: 'female', chiefComplaint: 'fever',
      vitals: { temperature: 39.5, pulse: 125, sbp: 118, dbp: 76, spo2: 98, gcs: 15 },
      symptoms: ['fever'],
      triageLevel: 2, recommendedDeptCode: 'internal', waitArea: 'resuscitation',
      needsUpgrade: true, triagedAt: iso(30),
    },
    {
      id: 'ST-003', patientId: 'P10003', age: 45, gender: 'male', chiefComplaint: 'abdominal pain',
      vitals: { temperature: 37.2, pulse: 84, sbp: 126, dbp: 80, spo2: 99, gcs: 15 },
      symptoms: ['abdominal_pain'],
      triageLevel: 3, recommendedDeptCode: 'gastroenterology', waitArea: 'waiting',
      needsUpgrade: false, triagedAt: iso(90),
    },
    {
      id: 'ST-004', patientId: 'P10004', age: 25, gender: 'female', chiefComplaint: 'cold',
      vitals: { temperature: 36.9, pulse: 76, sbp: 118, dbp: 72, spo2: 99, gcs: 15 },
      symptoms: ['cold', 'cough'],
      triageLevel: 4, recommendedDeptCode: 'emergency', waitArea: 'observation',
      needsUpgrade: false, triagedAt: iso(180),
    },
  ];
  seeds.forEach((r) => stStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/smart-triages 列表 ==============================

async function handleStList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  let items = Array.from(stStore.values());
  if (patientId) items = items.filter((r) => r.patientId === patientId);
  items = items.slice().sort((a, b) => b.triagedAt.localeCompare(a.triagedAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/smart-triages 新建 ==============================

async function handleStCreate(c: Ctx): Promise<Response> {
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
  const age = body.age;
  const gender = body.gender;
  const chiefComplaint = body.chiefComplaint;
  const vitals = body.vitals;
  const symptoms = body.symptoms;

  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

  const vitalKeys: (keyof SmartVitals)[] = ['temperature', 'pulse', 'sbp', 'dbp', 'spo2', 'gcs'];
  let vitalsOk = false;
  let parsedVitals: SmartVitals | null = null;
  if (vitals && typeof vitals === 'object' && !Array.isArray(vitals)) {
    const v = vitals as Record<string, unknown>;
    if (vitalKeys.every((k) => isNum(v[k]))) {
      parsedVitals = {
        temperature: v.temperature as number,
        pulse: v.pulse as number,
        sbp: v.sbp as number,
        dbp: v.dbp as number,
        spo2: v.spo2 as number,
        gcs: v.gcs as number,
      };
      vitalsOk = true;
    }
  }

  const symptomsArr: string[] = Array.isArray(symptoms)
    ? symptoms.filter((s): s is string => typeof s === 'string')
    : [];

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    !isNum(age) || age < 0 || age > 130 ||
    (typeof gender !== 'string' || !GENDERS.includes(gender as Gender)) ||
    typeof chiefComplaint !== 'string' || !chiefComplaint.trim() ||
    !vitalsOk || parsedVitals == null
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const level = runRuleEngine(parsedVitals, chiefComplaint.trim(), symptomsArr);

  stSeq += 1;
  const record: SmartTriageRecord = {
    id: `ST-${String(stSeq).padStart(3, '0')}`,
    patientId: patientId.trim(),
    age,
    gender: gender as Gender,
    chiefComplaint: chiefComplaint.trim(),
    vitals: parsedVitals,
    symptoms: symptomsArr,
    triageLevel: level,
    recommendedDeptCode: recommendedDept(chiefComplaint.trim(), symptomsArr),
    waitArea: waitAreaOf(level),
    needsUpgrade: level === 1 || level === 2,
    triagedAt: new Date().toISOString(),
  };
  stStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m540Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/smart-triages', handle: handleStList, auth: true },
  { method: 'POST', path: '/api/v1/smart-triages', handle: handleStCreate, auth: true },
];
