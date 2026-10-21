/**
 * 健澜科技 jlmedaios - M529 新标准 P0：VTE 抗凝疗程 CRUD 4 端点
 *
 * GET    /api/v1/vte/courses            疗程列表（patientId 过滤，startAt 倒序）
 * POST   /api/v1/vte/courses            启动疗程（status=active，timeline created+started）
 * POST   /api/v1/vte/courses/:id/bleeding-score  记录出血评分（≥40 自动 highRisk+requiresReview）
 * PATCH  /api/v1/vte/courses/:id/stop   停药（仅 active/planned→stopped，completed 不可再停→409）
 *
 * 状态机 planned→active→completed/stopped 不越级；所有写接口走内存 Map 短路，绝不连 PostgreSQL。
 * 字段铁律：枚举英文 key；数值 number；布尔 boolean；日期 ISO8601；禁止 undefined/NaN。
 * 与 M528 /assessments、M527 dict/*-v2、M526 dict/scales、patient/queue、/outpatient/* 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DrugCode = 'enoxaparin' | 'warfarin' | 'rivaroxaban' | 'apixaban' | 'dalteparin';
type RouteMed = 'subcutaneous' | 'iv';
type CourseStatus = 'planned' | 'active' | 'completed' | 'stopped';
type TimelineAction = 'created' | 'started' | 'bleeding_scored' | 'stopped' | 'completed';

const DRUG_CODES: DrugCode[] = ['enoxaparin', 'warfarin', 'rivaroxaban', 'apixaban', 'dalteparin'];
const MED_ROUTES: RouteMed[] = ['subcutaneous', 'iv'];
const STOP_FROM: CourseStatus[] = ['active', 'planned'];

interface TimelineEntry {
  action: TimelineAction;
  operator: string;
  at: string;
}

interface VteCourse {
  id: string;
  patientId: string;
  patientName: string;
  drugCode: DrugCode;
  dose: string;
  route: RouteMed;
  startAt: string;
  plannedStopAt: string;
  actualStopAt: string | null;
  status: CourseStatus;
  bleedingScore: number | null;
  highRisk: boolean;
  requiresReview: boolean;
  reviewedBy: string | null;
  timeline: TimelineEntry[];
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const courseStore = new Map<string, VteCourse>();
let courseSeq = 6;

function seedCourses(): void {
  const now = Date.now();
  const mk = (iso: number): string => new Date(iso).toISOString();
  const seeds: VteCourse[] = [
    {
      id: 'VTE-001', patientId: 'P10003', patientName: '王卫国',
      drugCode: 'enoxaparin', dose: '4000IU/次', route: 'subcutaneous',
      startAt: mk(now - 2 * 86_400_000), plannedStopAt: mk(now + 12 * 86_400_000), actualStopAt: null,
      status: 'active', bleedingScore: 12, highRisk: false, requiresReview: false, reviewedBy: null,
      timeline: [
        { action: 'created', operator: '陈医师', at: mk(now - 2 * 86_400_000) },
        { action: 'started', operator: '陈医师', at: mk(now - 2 * 86_400_000) },
        { action: 'bleeding_scored', operator: '陈医师', at: mk(now - 1 * 86_400_000) },
      ],
    },
    {
      id: 'VTE-002', patientId: 'P10005', patientName: '陈德荣',
      drugCode: 'rivaroxaban', dose: '10mg/次', route: 'iv',
      startAt: mk(now - 5 * 86_400_000), plannedStopAt: mk(now + 9 * 86_400_000), actualStopAt: null,
      status: 'active', bleedingScore: 45, highRisk: true, requiresReview: true, reviewedBy: null,
      timeline: [
        { action: 'created', operator: '赵医师', at: mk(now - 5 * 86_400_000) },
        { action: 'started', operator: '赵医师', at: mk(now - 5 * 86_400_000) },
        { action: 'bleeding_scored', operator: '赵医师', at: mk(now - 3 * 86_400_000) },
      ],
    },
    {
      id: 'VTE-003', patientId: 'P10003', patientName: '王卫国',
      drugCode: 'dalteparin', dose: '5000IU/次', route: 'subcutaneous',
      startAt: mk(now - 1 * 86_400_000), plannedStopAt: mk(now + 13 * 86_400_000), actualStopAt: null,
      status: 'active', bleedingScore: null, highRisk: false, requiresReview: false, reviewedBy: null,
      timeline: [
        { action: 'created', operator: '陈医师', at: mk(now - 1 * 86_400_000) },
        { action: 'started', operator: '陈医师', at: mk(now - 1 * 86_400_000) },
      ],
    },
    {
      id: 'VTE-004', patientId: 'P10001', patientName: '张建国',
      drugCode: 'warfarin', dose: '2.5mg/次', route: 'iv',
      startAt: mk(now - 60 * 86_400_000), plannedStopAt: mk(now - 30 * 86_400_000), actualStopAt: mk(now - 30 * 86_400_000),
      status: 'completed', bleedingScore: 25, highRisk: false, requiresReview: false, reviewedBy: '刘主任',
      timeline: [
        { action: 'created', operator: '孙医师', at: mk(now - 60 * 86_400_000) },
        { action: 'started', operator: '孙医师', at: mk(now - 60 * 86_400_000) },
        { action: 'completed', operator: '刘主任', at: mk(now - 30 * 86_400_000) },
      ],
    },
    {
      id: 'VTE-005', patientId: 'P10002', patientName: '李秀兰',
      drugCode: 'apixaban', dose: '2.5mg/次', route: 'iv',
      startAt: mk(now - 10 * 86_400_000), plannedStopAt: mk(now + 4 * 86_400_000), actualStopAt: mk(now - 2 * 86_400_000),
      status: 'stopped', bleedingScore: 52, highRisk: true, requiresReview: false, reviewedBy: '周主任',
      timeline: [
        { action: 'created', operator: '周医师', at: mk(now - 10 * 86_400_000) },
        { action: 'started', operator: '周医师', at: mk(now - 10 * 86_400_000) },
        { action: 'bleeding_scored', operator: '周医师', at: mk(now - 3 * 86_400_000) },
        { action: 'stopped', operator: '周主任', at: mk(now - 2 * 86_400_000) },
      ],
    },
    {
      id: 'VTE-006', patientId: 'P10004', patientName: '赵敏',
      drugCode: 'enoxaparin', dose: '4000IU/次', route: 'subcutaneous',
      startAt: mk(now + 1 * 86_400_000), plannedStopAt: mk(now + 15 * 86_400_000), actualStopAt: null,
      status: 'planned', bleedingScore: null, highRisk: false, requiresReview: false, reviewedBy: null,
      timeline: [
        { action: 'created', operator: '吴医师', at: mk(now - 1 * 86_400_000) },
      ],
    },
  ];
  seeds.forEach((r) => courseStore.set(r.id, r));
}
seedCourses();

// ============================== 1. GET /api/v1/vte/courses 列表 ==============================

async function handleCourseList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  let items = Array.from(courseStore.values());
  if (patientId) items = items.filter((r) => r.patientId === patientId);
  items = items.slice().sort((a, b) => b.startAt.localeCompare(a.startAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/vte/courses 启动疗程 ==============================

async function handleCourseCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;

  const patientId = str(body.patientId);
  const patientName = str(body.patientName);
  const drugCode = body.drugCode;
  const dose = str(body.dose);
  const routeMed = body.route;
  const startAt = str(body.startAt);
  const plannedStopAt = str(body.plannedStopAt);
  const baselineScore = body.baselineBleedingScore;

  const scoreValid =
    typeof baselineScore === 'number' && Number.isFinite(baselineScore) && baselineScore >= 0 && baselineScore <= 100;

  if (
    !patientId || !patientName || !dose || !startAt || !plannedStopAt ||
    !DRUG_CODES.includes(drugCode as DrugCode) ||
    !MED_ROUTES.includes(routeMed as RouteMed) ||
    baselineScore == null || !scoreValid
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const nowIso = new Date().toISOString();
  courseSeq += 1;
  const highRisk = (baselineScore as number) >= 40;
  const record: VteCourse = {
    id: `VTE-${String(courseSeq).padStart(3, '0')}`,
    patientId,
    patientName,
    drugCode: drugCode as DrugCode,
    dose,
    route: routeMed as RouteMed,
    startAt: startAt as string,
    plannedStopAt: plannedStopAt as string,
    actualStopAt: null,
    status: 'active',
    bleedingScore: baselineScore as number,
    highRisk,
    requiresReview: highRisk,
    reviewedBy: null,
    timeline: [
      { action: 'created', operator: patientName as string, at: nowIso },
      { action: 'started', operator: patientName as string, at: nowIso },
    ],
  };
  courseStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

// ============================== 3. POST /api/v1/vte/courses/:id/bleeding-score ==============================

async function handleBleedingScore(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const record = courseStore.get(id);
  if (!record) return json({ code: 404, message: 'course not found' }, 404);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const score = body.score;
  const recordedBy = typeof body.recordedBy === 'string' && body.recordedBy.trim() ? body.recordedBy.trim() : null;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100 || !recordedBy) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  record.bleedingScore = score;
  if (score >= 40) {
    record.highRisk = true;
    record.requiresReview = true;
  }
  record.timeline.push({ action: 'bleeding_scored', operator: recordedBy, at: new Date().toISOString() });
  courseStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

// ============================== 4. PATCH /api/v1/vte/courses/:id/stop ==============================

async function handleCourseStop(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const record = courseStore.get(id);
  if (!record) return json({ code: 404, message: 'course not found' }, 404);

  if (!STOP_FROM.includes(record.status)) {
    return json({ code: 409, message: 'invalid state transition' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;
  const stopDate = typeof body.stopDate === 'string' && body.stopDate.trim() ? body.stopDate.trim() : null;
  const reviewedBy = typeof body.reviewedBy === 'string' && body.reviewedBy.trim() ? body.reviewedBy.trim() : null;

  if (!reason || !stopDate) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (record.highRisk && !reviewedBy) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  record.status = 'stopped';
  record.actualStopAt = stopDate;
  if (reviewedBy) record.reviewedBy = reviewedBy;
  record.timeline.push({ action: 'stopped', operator: reviewedBy ?? 'system', at: new Date().toISOString() });
  courseStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m529Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/vte/courses', handle: handleCourseList, auth: true },
  { method: 'POST', path: '/api/v1/vte/courses', handle: handleCourseCreate, auth: true },
  { method: 'POST', path: '/api/v1/vte/courses/:id/bleeding-score', handle: handleBleedingScore, auth: true },
  { method: 'PATCH', path: '/api/v1/vte/courses/:id/stop', handle: handleCourseStop, auth: true },
];
