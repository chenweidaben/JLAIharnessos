/**
 * 健澜科技 jlmedaios - M530 新标准 P0：PACU Aldrete 出室评分 CRUD 3 端点
 *
 * GET    /api/v1/pacu/records?visitId=                       记录列表（assessedAt 倒序）
 * POST   /api/v1/pacu/records                               新建（后端自动算 scoreTotal 与 isReadyForDischarge）
 * PATCH  /api/v1/pacu/records/:id/discharge-application     出室申请（仅 readyForDischarge 可申请）
 *
 * 状态机 monitored→readyForDischarge→discharged 不可越级；
 * isReadyForDischarge = scoreTotal>=9 && bleeding===false && nauseaVomiting===false；
 * 写接口全部内存 Map 短路，绝不连 PostgreSQL，不抛 500。
 * 与 M529 /vte/courses、M528 /assessments、M527 dict/*-v2、/outpatient/* 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DimScore = 0 | 1 | 2;
type RecordStatus = 'monitored' | 'readyForDischarge' | 'discharged';
type TimelineAction = 'created' | 'ready' | 'discharge_applied' | 'discharged';

const DIM_KEYS = ['activity', 'breathing', 'circulation', 'consciousness', 'oxygenation'] as const;
type DimKey = (typeof DIM_KEYS)[number];

interface VitalSigns {
  sbp: number;
  hr: number;
  spo2: number;
}

interface TimelineEntry {
  action: TimelineAction;
  operator: string;
  at: string;
}

interface PacuRecord {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  activity: DimScore;
  breathing: DimScore;
  circulation: DimScore;
  consciousness: DimScore;
  oxygenation: DimScore;
  scoreTotal: number;
  bleeding: boolean;
  nauseaVomiting: boolean;
  isReadyForDischarge: boolean;
  status: RecordStatus;
  vitalSigns: VitalSigns;
  assessedAt: string;
  dischargeAppliedAt: string | null;
  dischargedAt: string | null;
  anesthesiologist: string;
  dischargeSignature: string | null;
  timeline: TimelineEntry[];
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const pacuStore = new Map<string, PacuRecord>();
let pacuSeq = 6;

function isDimScore(v: unknown): v is DimScore {
  return v === 0 || v === 1 || v === 2;
}

function calcReady(total: number, bleeding: boolean, nauseaVomiting: boolean): boolean {
  return total >= 9 && bleeding === false && nauseaVomiting === false;
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: PacuRecord[] = [
    {
      id: 'PACU-001', visitId: 'V2026102101', patientId: 'P10001', patientName: '张建国',
      activity: 2, breathing: 2, circulation: 2, consciousness: 2, oxygenation: 2,
      scoreTotal: 10, bleeding: false, nauseaVomiting: false, isReadyForDischarge: true,
      status: 'readyForDischarge', vitalSigns: { sbp: 132, hr: 76, spo2: 97 },
      assessedAt: iso(20), dischargeAppliedAt: null, dischargedAt: null,
      anesthesiologist: '王麻醉师', dischargeSignature: null,
      timeline: [
        { action: 'created', operator: '王麻醉师', at: iso(30) },
        { action: 'ready', operator: '王麻醉师', at: iso(20) },
      ],
    },
    {
      id: 'PACU-002', visitId: 'V2026102102', patientId: 'P10002', patientName: '李秀兰',
      activity: 2, breathing: 2, circulation: 2, consciousness: 2, oxygenation: 1,
      scoreTotal: 9, bleeding: false, nauseaVomiting: false, isReadyForDischarge: true,
      status: 'readyForDischarge', vitalSigns: { sbp: 128, hr: 72, spo2: 94 },
      assessedAt: iso(15), dischargeAppliedAt: null, dischargedAt: null,
      anesthesiologist: '李麻醉师', dischargeSignature: null,
      timeline: [
        { action: 'created', operator: '李麻醉师', at: iso(25) },
        { action: 'ready', operator: '李麻醉师', at: iso(15) },
      ],
    },
    {
      id: 'PACU-003', visitId: 'V2026102103', patientId: 'P10003', patientName: '王卫国',
      activity: 2, breathing: 2, circulation: 2, consciousness: 1, oxygenation: 1,
      scoreTotal: 8, bleeding: false, nauseaVomiting: true, isReadyForDischarge: false,
      status: 'monitored', vitalSigns: { sbp: 142, hr: 88, spo2: 92 },
      assessedAt: iso(40), dischargeAppliedAt: null, dischargedAt: null,
      anesthesiologist: '张麻醉师', dischargeSignature: null,
      timeline: [{ action: 'created', operator: '张麻醉师', at: iso(45) }],
    },
    {
      id: 'PACU-004', visitId: 'V2026102104', patientId: 'P10004', patientName: '赵敏',
      activity: 2, breathing: 1, circulation: 2, consciousness: 1, oxygenation: 1,
      scoreTotal: 7, bleeding: true, nauseaVomiting: false, isReadyForDischarge: false,
      status: 'monitored', vitalSigns: { sbp: 152, hr: 96, spo2: 89 },
      assessedAt: iso(50), dischargeAppliedAt: null, dischargedAt: null,
      anesthesiologist: '刘麻醉师', dischargeSignature: null,
      timeline: [{ action: 'created', operator: '刘麻醉师', at: iso(55) }],
    },
    {
      id: 'PACU-005', visitId: 'V2026102105', patientId: 'P10005', patientName: '陈德荣',
      activity: 2, breathing: 2, circulation: 2, consciousness: 2, oxygenation: 2,
      scoreTotal: 10, bleeding: false, nauseaVomiting: false, isReadyForDischarge: true,
      status: 'discharged', vitalSigns: { sbp: 126, hr: 70, spo2: 98 },
      assessedAt: iso(120), dischargeAppliedAt: iso(30), dischargedAt: iso(25),
      anesthesiologist: '王麻醉师', dischargeSignature: '王麻醉师',
      timeline: [
        { action: 'created', operator: '王麻醉师', at: iso(120) },
        { action: 'ready', operator: '王麻醉师', at: iso(90) },
        { action: 'discharge_applied', operator: '王麻醉师', at: iso(30) },
        { action: 'discharged', operator: '王麻醉师', at: iso(25) },
      ],
    },
    {
      id: 'PACU-006', visitId: 'V2026102106', patientId: 'P10006', patientName: '孙桂芳',
      activity: 2, breathing: 2, circulation: 2, consciousness: 2, oxygenation: 1,
      scoreTotal: 9, bleeding: false, nauseaVomiting: false, isReadyForDischarge: true,
      status: 'discharged', vitalSigns: { sbp: 124, hr: 68, spo2: 95 },
      assessedAt: iso(150), dischargeAppliedAt: iso(60), dischargedAt: iso(55),
      anesthesiologist: '李麻醉师', dischargeSignature: '李麻醉师',
      timeline: [
        { action: 'created', operator: '李麻醉师', at: iso(150) },
        { action: 'ready', operator: '李麻醉师', at: iso(110) },
        { action: 'discharge_applied', operator: '李麻醉师', at: iso(60) },
        { action: 'discharged', operator: '李麻醉师', at: iso(55) },
      ],
    },
  ];
  seeds.forEach((r) => pacuStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/pacu/records 列表 ==============================

async function handlePacuList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  let items = Array.from(pacuStore.values());
  if (visitId) items = items.filter((r) => r.visitId === visitId);
  items = items.slice().sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/pacu/records 新建 ==============================

async function handlePacuCreate(c: Ctx): Promise<Response> {
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
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  const visitId = str(body.visitId);
  const patientId = str(body.patientId);
  const patientName = str(body.patientName);
  const anesthesiologist = str(body.anesthesiologist);
  const bleeding = body.bleeding;
  const nauseaVomiting = body.nauseaVomiting;
  const sbp = num(body.sbp);
  const hr = num(body.hr);
  const spo2 = num(body.spo2);

  const dimScores: Record<DimKey, DimScore> = {} as Record<DimKey, DimScore>;
  for (const key of DIM_KEYS) {
    const v = body[key];
    if (!isDimScore(v)) return json({ code: 400, message: 'invalid payload' }, 400);
    dimScores[key] = v;
  }

  if (
    !visitId || !patientId || !patientName || !anesthesiologist ||
    typeof bleeding !== 'boolean' || typeof nauseaVomiting !== 'boolean' ||
    sbp == null || hr == null || spo2 == null
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const scoreTotal = dimScores.activity + dimScores.breathing + dimScores.circulation +
    dimScores.consciousness + dimScores.oxygenation;
  const ready = calcReady(scoreTotal, bleeding, nauseaVomiting);
  const nowIso = new Date().toISOString();

  pacuSeq += 1;
  const timeline: TimelineEntry[] = [
    { action: 'created', operator: anesthesiologist, at: nowIso },
  ];
  if (ready) {
    timeline.push({ action: 'ready', operator: anesthesiologist, at: nowIso });
  }

  const record: PacuRecord = {
    id: `PACU-${String(pacuSeq).padStart(3, '0')}`,
    visitId,
    patientId,
    patientName,
    activity: dimScores.activity,
    breathing: dimScores.breathing,
    circulation: dimScores.circulation,
    consciousness: dimScores.consciousness,
    oxygenation: dimScores.oxygenation,
    scoreTotal,
    bleeding,
    nauseaVomiting,
    isReadyForDischarge: ready,
    status: ready ? 'readyForDischarge' : 'monitored',
    vitalSigns: { sbp, hr, spo2 },
    assessedAt: nowIso,
    dischargeAppliedAt: null,
    dischargedAt: null,
    anesthesiologist,
    dischargeSignature: null,
    timeline,
  };
  pacuStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

// ============================== 3. PATCH /api/v1/pacu/records/:id/discharge-application ==============================

async function handleDischargeApply(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const record = pacuStore.get(id);
  if (!record) return json({ code: 404, message: 'pacu record not found' }, 404);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const signature = typeof body.signature === 'string' && body.signature.trim() ? body.signature.trim() : null;
  const dischargedAt =
    typeof body.dischargedAt === 'string' && body.dischargedAt.trim() ? body.dischargedAt.trim() : null;
  if (!signature) return json({ code: 400, message: 'invalid payload' }, 400);

  // 状态机：仅 readyForDischarge 可申请出室；且二次校验出室判定
  if (record.status !== 'readyForDischarge' || !record.isReadyForDischarge) {
    return json({ code: 409, message: 'invalid state transition' }, 409);
  }

  const nowIso = new Date().toISOString();
  record.dischargeSignature = signature;
  record.dischargeAppliedAt = nowIso;
  record.dischargedAt = dischargedAt ?? nowIso;
  record.status = 'discharged';
  record.timeline.push(
    { action: 'discharge_applied', operator: signature, at: nowIso },
    { action: 'discharged', operator: signature, at: nowIso },
  );
  pacuStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m530Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pacu/records', handle: handlePacuList, auth: true },
  { method: 'POST', path: '/api/v1/pacu/records', handle: handlePacuCreate, auth: true },
  { method: 'PATCH', path: '/api/v1/pacu/records/:id/discharge-application', handle: handleDischargeApply, auth: true },
];
