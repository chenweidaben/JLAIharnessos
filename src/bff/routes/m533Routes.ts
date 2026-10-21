/**
 * 健澜科技 jlmedaios - M533 新标准 P0：急诊四级预检分诊路由 2 端点
 *
 * GET  /api/v1/er-triages?visitId=   列表（triagedAt 倒序）
 * POST /api/v1/er-triages            新建（后端二次校验生命体征异常 → needsUpgrade + escalateReason）
 *
 * 异常规则冻结：spo2<90 / sbp<90 / gcs<9 任一命中 → needsUpgrade=true；
 * waitArea 按 level 映射：level1/level2 → resuscitation；level3 → waiting；level4 → observation。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；escalateReason 为展示短语可中文。
 * 与 M532 /barthel-scores、M531 /icu-sedations、M530 /pacu/records 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type TriageLevel = 'level1' | 'level2' | 'level3' | 'level4';
type WaitArea = 'resuscitation' | 'waiting' | 'observation';

interface Vitals {
  temperature: number;
  pulse: number;
  respiration: number;
  sbp: number;
  dbp: number;
  spo2: number;
  gcs: number;
}

interface ErTriageRecord {
  id: string;
  visitId: string;
  level: TriageLevel;
  vitals: Vitals;
  chiefComplaint: string;
  objective: string | null;
  needsUpgrade: boolean;
  escalateReason: string | null;
  waitArea: WaitArea;
  triagedAt: string;
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const triageStore = new Map<string, ErTriageRecord>();
let triageSeq = 2;

const VITAL_KEYS: Array<keyof Vitals> = ['temperature', 'pulse', 'respiration', 'sbp', 'dbp', 'spo2', 'gcs'];

function waitAreaOf(level: TriageLevel): WaitArea {
  if (level === 'level1' || level === 'level2') return 'resuscitation';
  if (level === 'level3') return 'waiting';
  return 'observation';
}

/** 后端二次校验：spo2<90 / sbp<90 / gcs<9 任一命中返回中文展示短语，否则 null */
function detectAbnormal(v: Vitals): string | null {
  if (v.spo2 < 90) return `SpO₂ ${v.spo2}% < 90%`;
  if (v.sbp < 90) return `收缩压 ${v.sbp} mmHg < 90 mmHg`;
  if (v.gcs < 9) return `GCS ${v.gcs} < 9`;
  return null;
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: ErTriageRecord[] = [
    {
      id: 'TRI-001',
      visitId: 'V2026102101',
      level: 'level2',
      vitals: { temperature: 36.8, pulse: 110, respiration: 24, sbp: 96, dbp: 60, spo2: 93, gcs: 14 },
      chiefComplaint: '胸痛 2 小时',
      objective: '心电图 ST 段抬高',
      needsUpgrade: false,
      escalateReason: null,
      waitArea: 'resuscitation',
      triagedAt: iso(20),
    },
    {
      id: 'TRI-002',
      visitId: 'V2026102102',
      level: 'level3',
      vitals: { temperature: 37.2, pulse: 78, respiration: 18, sbp: 132, dbp: 84, spo2: 98, gcs: 15 },
      chiefComplaint: '腹痛 1 天',
      objective: null,
      needsUpgrade: false,
      escalateReason: null,
      waitArea: 'waiting',
      triagedAt: iso(40),
    },
  ];
  seeds.forEach((r) => triageStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/er-triages 列表 ==============================

async function handleTriageList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  let items = Array.from(triageStore.values());
  if (visitId) items = items.filter((r) => r.visitId === visitId);
  items = items.slice().sort((a, b) => b.triagedAt.localeCompare(a.triagedAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/er-triages 新建 ==============================

async function handleTriageCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const visitId = body.visitId;
  const level = body.level;
  const chiefComplaint = body.chiefComplaint;
  const vitalsRaw = body.vitals;

  if (
    typeof visitId !== 'string' || !visitId.trim() ||
    (level !== 'level1' && level !== 'level2' && level !== 'level3' && level !== 'level4') ||
    typeof chiefComplaint !== 'string' || !chiefComplaint.trim() ||
    vitalsRaw == null || typeof vitalsRaw !== 'object' || Array.isArray(vitalsRaw)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const vitalsObj = vitalsRaw as Record<string, unknown>;
  const vitals = {} as Vitals;
  for (const key of VITAL_KEYS) {
    const v = vitalsObj[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return json({ code: 400, message: 'invalid payload' }, 400);
    }
    vitals[key] = v;
  }

  const objective = body.objective;
  const objectiveStr =
    typeof objective === 'string' && objective.trim() ? objective.trim() : null;

  const escalateReason = detectAbnormal(vitals);

  triageSeq += 1;
  const record: ErTriageRecord = {
    id: `TRI-${String(triageSeq).padStart(3, '0')}`,
    visitId: visitId.trim(),
    level: level as TriageLevel,
    vitals,
    chiefComplaint: chiefComplaint.trim(),
    objective: objectiveStr,
    needsUpgrade: escalateReason != null,
    escalateReason,
    waitArea: waitAreaOf(level as TriageLevel),
    triagedAt: new Date().toISOString(),
  };
  triageStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m533Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/er-triages', handle: handleTriageList, auth: true },
  { method: 'POST', path: '/api/v1/er-triages', handle: handleTriageCreate, auth: true },
];
