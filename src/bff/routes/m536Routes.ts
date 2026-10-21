/**
 * 健澜科技 jlmedaios - M536 新标准 P0：心理筛查 PHQ-9/GAD-7 路由 2 端点
 *
 * GET  /api/v1/psych/screens?visitId=   列表（screenedAt 倒序）
 * POST /api/v1/psych/screens              新建（后端自动求和总分与分级，≥中度→needsPsychReferral）
 *
 * 分级冻结：
 *   phq9：<10 mild / 10–14 moderate / 15–19 moderatelySevere / ≥20 severe
 *   gad7：<10 mild / 10–14 moderate / ≥15 severe
 *   needsPsychReferral = level !== 'mild'。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M535 /chronic/followups、M534 /trauma/niss、M533 /er-triages 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Instrument = 'phq9' | 'gad7';
type ScreenLevel = 'mild' | 'moderate' | 'moderatelySevere' | 'severe';

interface PsychScreenRecord {
  id: string;
  visitId: string;
  instrument: Instrument;
  answers: number[];
  totalScore: number;
  level: ScreenLevel;
  needsPsychReferral: boolean;
  screenedAt: string;
}

const INSTRUMENT_LENGTH: Record<Instrument, number> = { phq9: 9, gad7: 7 };

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const psychStore = new Map<string, PsychScreenRecord>();
let psychSeq = 4;

function levelOf(instrument: Instrument, total: number): ScreenLevel {
  if (instrument === 'phq9') {
    if (total < 10) return 'mild';
    if (total <= 14) return 'moderate';
    if (total <= 19) return 'moderatelySevere';
    return 'severe';
  }
  // gad7
  if (total < 10) return 'mild';
  if (total <= 14) return 'moderate';
  return 'severe';
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: PsychScreenRecord[] = [
    {
      id: 'PSY-001', visitId: 'V2026102101', instrument: 'phq9',
      answers: [1, 1, 1, 1, 2, 1, 1, 1, 1], totalScore: 10, level: 'moderate',
      needsPsychReferral: true, screenedAt: iso(60),
    },
    {
      id: 'PSY-002', visitId: 'V2026102102', instrument: 'phq9',
      answers: [3, 3, 3, 2, 3, 2, 3, 2, 1], totalScore: 22, level: 'severe',
      needsPsychReferral: true, screenedAt: iso(120),
    },
    {
      id: 'PSY-003', visitId: 'V2026102103', instrument: 'gad7',
      answers: [1, 2, 2, 1, 2, 2, 1], totalScore: 11, level: 'moderate',
      needsPsychReferral: true, screenedAt: iso(180),
    },
    {
      id: 'PSY-004', visitId: 'V2026102104', instrument: 'gad7',
      answers: [0, 0, 1, 0, 1, 0, 1], totalScore: 3, level: 'mild',
      needsPsychReferral: false, screenedAt: iso(240),
    },
  ];
  seeds.forEach((r) => psychStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/psych/screens 列表 ==============================

async function handlePsychList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  let items = Array.from(psychStore.values());
  if (visitId) items = items.filter((r) => r.visitId === visitId);
  items = items.slice().sort((a, b) => b.screenedAt.localeCompare(a.screenedAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/psych/screens 新建 ==============================

async function handlePsychCreate(c: Ctx): Promise<Response> {
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
  const instrument = body.instrument;
  const answers = body.answers;

  if (
    typeof visitId !== 'string' || !visitId.trim() ||
    (instrument !== 'phq9' && instrument !== 'gad7') ||
    !Array.isArray(answers)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const inst = instrument as Instrument;
  const expectedLen = INSTRUMENT_LENGTH[inst];
  if (answers.length !== expectedLen) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  for (const v of answers) {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 3) {
      return json({ code: 400, message: 'invalid payload' }, 400);
    }
  }

  const totalScore = (answers as number[]).reduce((acc, v) => acc + v, 0);
  const level = levelOf(inst, totalScore);

  psychSeq += 1;
  const record: PsychScreenRecord = {
    id: `PSY-${String(psychSeq).padStart(3, '0')}`,
    visitId: visitId.trim(),
    instrument: inst,
    answers: answers as number[],
    totalScore,
    level,
    needsPsychReferral: level !== 'mild',
    screenedAt: new Date().toISOString(),
  };
  psychStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m536Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/psych/screens', handle: handlePsychList, auth: true },
  { method: 'POST', path: '/api/v1/psych/screens', handle: handlePsychCreate, auth: true },
];
