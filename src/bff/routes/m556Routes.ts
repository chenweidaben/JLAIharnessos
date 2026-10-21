/**
 * 健澜科技 jlmedaios - M556 新标准 P3：跌倒评估与上报闭环 3 端点
 *
 * GET  /api/v1/fall-assessments?patientId=&level=   列表（assessmentTime 倒序；过滤参数）
 * POST /api/v1/fall-assessments                    新建（后端自动 Morse level：<25 low / 25-44 medium / ≥45 high；high 必须配 interventions）
 * POST /api/v1/fall-assessments/:id/fall-event     记录实际跌倒（已记录→409 fall_event_already_recorded）
 *
 * 种子 8 条：low/medium/high 三级覆盖；2 条已记录实际跌倒事件（fallEvent 非空）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type FallLevel = 'low' | 'medium' | 'high';
type InjuryType = 'none' | 'minor' | 'major';

interface FallEvent {
  fallTime: string;
  location: string;
  injuryType: InjuryType;
  bodyPart: string;
}

interface FallRecord {
  id: string;
  patientId: string;
  visitId: string;
  morseScore: number;
  level: FallLevel;
  fallRiskFactors: string[];
  interventions: string[];
  assessmentTime: string;
  fallEvent: FallEvent | null;
}

// ============================== 内存态库（DEMO 短路） ==============================

const fallStore = new Map<string, FallRecord>();
let fallSeq = 0;

function addFall(r: Omit<FallRecord, 'id'>): FallRecord {
  fallSeq += 1;
  const rec: FallRecord = { ...r, id: `FALL-${String(fallSeq).padStart(3, '0')}` };
  fallStore.set(rec.id, rec);
  return rec;
}

function morseLevel(score: number): FallLevel {
  if (score < 25) return 'low';
  if (score < 45) return 'medium';
  return 'high';
}

function seedFall(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 2 条已记录实际跌倒事件（fallEvent 非空）
  addFall({ patientId: 'P-F001', visitId: 'V-F001', morseScore: 65, level: 'high', fallRiskFactors: ['history_fall', 'gait_weak', 'sedative'], interventions: ['bed_rail', 'call_bell_within_reach', 'hourly_rounding'], assessmentTime: iso(60 * 72), fallEvent: { fallTime: iso(60 * 24), location: '卫生间', injuryType: 'minor', bodyPart: '右侧肘部' } });
  addFall({ patientId: 'P-F002', visitId: 'V-F002', morseScore: 50, level: 'high', fallRiskFactors: ['history_fall', 'mental_confusion'], interventions: ['bed_rail', 'yellow_band'], assessmentTime: iso(60 * 48), fallEvent: { fallTime: iso(60 * 12), location: '病房床旁', injuryType: 'major', bodyPart: '左侧髋部' } });

  // 6 条未记录跌倒事件（fallEvent=null）
  addFall({ patientId: 'P-F003', visitId: 'V-F003', morseScore: 20, level: 'low', fallRiskFactors: [], interventions: [], assessmentTime: iso(60 * 36), fallEvent: null });
  addFall({ patientId: 'P-F004', visitId: 'V-F004', morseScore: 30, level: 'medium', fallRiskFactors: ['gait_weak'], interventions: ['non_slide_slippers'], assessmentTime: iso(60 * 30), fallEvent: null });
  addFall({ patientId: 'P-F005', visitId: 'V-F005', morseScore: 55, level: 'high', fallRiskFactors: ['history_fall', 'sedative'], interventions: ['bed_rail', 'yellow_band', 'hourly_rounding'], assessmentTime: iso(60 * 20), fallEvent: null });
  addFall({ patientId: 'P-F006', visitId: 'V-F006', morseScore: 40, level: 'medium', fallRiskFactors: ['diuresis'], interventions: ['toilet_schedule'], assessmentTime: iso(60 * 10), fallEvent: null });
  addFall({ patientId: 'P-F007', visitId: 'V-F007', morseScore: 15, level: 'low', fallRiskFactors: [], interventions: [], assessmentTime: iso(60 * 4), fallEvent: null });
  addFall({ patientId: 'P-F008', visitId: 'V-F008', morseScore: 70, level: 'high', fallRiskFactors: ['history_fall', 'gait_weak', 'mental_confusion', 'sedative'], interventions: ['bed_rail', 'yellow_band', 'hourly_rounding', 'sitters'], assessmentTime: iso(30), fallEvent: null });
}
seedFall();

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

// ============================== 1. GET /api/v1/fall-assessments ==============================

async function handleFallList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const level = (c.query.get('level') ?? '').trim();

  let rows = Array.from(fallStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (level) rows = rows.filter((r) => r.level === level);
  rows = rows.sort((a, b) => b.assessmentTime.localeCompare(a.assessmentTime));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/fall-assessments ==============================

async function handleFallCreate(c: Ctx): Promise<Response> {
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
  const morseScore = body.morseScore;
  const fallRiskFactors = body.fallRiskFactors;
  const interventions = body.interventions;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof morseScore !== 'number' || !Number.isFinite(morseScore) ||
    morseScore < 0 || morseScore > 125 ||
    !Array.isArray(fallRiskFactors) ||
    !Array.isArray(interventions)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const level = morseLevel(morseScore);
  if (level === 'high' && interventions.length === 0) {
    return json({ code: 400, message: 'high_risk_requires_interventions' }, 400);
  }

  const rec = addFall({
    patientId: patientId.trim(),
    visitId: visitId.trim(),
    morseScore,
    level,
    fallRiskFactors: fallRiskFactors as string[],
    interventions: interventions as string[],
    assessmentTime: new Date().toISOString(),
    fallEvent: null,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/fall-assessments/:id/fall-event ==============================

async function handleFallEvent(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = fallStore.get(id);
  if (!rec) return notFound('FallAssessment', id);

  if (rec.fallEvent) {
    return json({ code: 409, message: 'fall_event_already_recorded' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const fallTime = body.fallTime;
  const location = body.location;
  const injuryType = body.injuryType;
  const bodyPart = body.bodyPart;

  if (
    typeof fallTime !== 'string' || !fallTime.trim() ||
    typeof location !== 'string' || !location.trim() ||
    typeof injuryType !== 'string' || (injuryType !== 'none' && injuryType !== 'minor' && injuryType !== 'major') ||
    typeof bodyPart !== 'string' || !bodyPart.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.fallEvent = {
    fallTime: fallTime.trim(),
    location: location.trim(),
    injuryType: injuryType as InjuryType,
    bodyPart: bodyPart.trim(),
  };
  return json(ok(rec), 200);
}

export const m556Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fall-assessments', handle: handleFallList, auth: true },
  { method: 'POST', path: '/api/v1/fall-assessments', handle: handleFallCreate, auth: true },
  { method: 'POST', path: '/api/v1/fall-assessments/:id/fall-event', handle: handleFallEvent, auth: true },
];
