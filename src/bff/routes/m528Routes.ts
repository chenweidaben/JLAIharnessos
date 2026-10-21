/**
 * 健澜科技 jlmedaios - M528 新标准 P0：评估记录统一契约（列表/详情/内存态写入）3 端点
 *
 * assessments 评估记录：GET 列表（scaleKey/visitId 过滤）、GET 详情（:id，404 兜底）、POST 新建（内存 Map 短路，禁连 PostgreSQL）。
 * 状态机：draft → submitted → signed，不可越级；新建接口仅产出 draft / submitted，不允许直接 signed；签名留痕 + timeline 时间链闭环。
 *
 * 字段铁律：枚举英文 key；scores 值 number；日期 ISO8601；禁止 undefined/NaN。
 * 与 M527 /dict/*-v2、M526 /dict/scales、/patient/queue、M525 /nursing-care/*、/outpatient/* 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type ScaleKey = 'asa' | 'rass' | 'aldrete' | 'braden' | 'morse' | 'nrs' | 'nrs2002' | 'barthel' | 'erTriage' | 'ais';
type AssessStatus = 'draft' | 'submitted' | 'signed' | 'rejected';
type TimelineAction = 'created' | 'submitted' | 'signed' | 'rejected';
type TimelineRole = 'physician' | 'nurse' | 'anesthesiologist';

const SCALE_KEYS: ScaleKey[] = ['asa', 'rass', 'aldrete', 'braden', 'morse', 'nrs', 'nrs2002', 'barthel', 'erTriage', 'ais'];

interface TimelineEntry {
  action: TimelineAction;
  operator: string;
  role: TimelineRole;
  at: string;
}

interface AssessmentRecord {
  id: string;
  visitId: string;
  patientId: string;
  scaleKey: ScaleKey;
  assessorId: string;
  assessorName: string;
  assessedAt: string;
  scores: Record<string, number>;
  scoreTotal: number;
  level: string;
  status: AssessStatus;
  signature: string | null;
  timeline: TimelineEntry[];
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const assessmentStore = new Map<string, AssessmentRecord>();
let assessmentSeq = 10;

function seedAssessments(): void {
  const seeds: AssessmentRecord[] = [
    {
      id: 'AS-001', visitId: 'V2026102101', patientId: 'P10001', scaleKey: 'asa',
      assessorId: 'A001', assessorName: '张麻醉师', assessedAt: '2026-10-21T08:00:00+08:00',
      scores: { asa: 2 }, scoreTotal: 2, level: 'ASA Ⅱ级 轻度系统性疾病', status: 'signed', signature: 'sig-zhang-a001',
      timeline: [
        { action: 'created', operator: '张麻醉师', role: 'anesthesiologist', at: '2026-10-21T08:00:00+08:00' },
        { action: 'submitted', operator: '张麻醉师', role: 'anesthesiologist', at: '2026-10-21T08:05:00+08:00' },
        { action: 'signed', operator: '李主任', role: 'anesthesiologist', at: '2026-10-21T08:12:00+08:00' },
      ],
    },
    {
      id: 'AS-002', visitId: 'V2026102102', patientId: 'P10002', scaleKey: 'rass',
      assessorId: 'B002', assessorName: '李医师', assessedAt: '2026-10-21T08:10:00+08:00',
      scores: { rass: 0 }, scoreTotal: 0, level: '平静合作', status: 'submitted', signature: 'sig-li-b002',
      timeline: [
        { action: 'created', operator: '李医师', role: 'physician', at: '2026-10-21T08:10:00+08:00' },
        { action: 'submitted', operator: '李医师', role: 'physician', at: '2026-10-21T08:16:00+08:00' },
      ],
    },
    {
      id: 'AS-003', visitId: 'V2026102103', patientId: 'P10003', scaleKey: 'aldrete',
      assessorId: 'A003', assessorName: '王麻醉师', assessedAt: '2026-10-21T08:20:00+08:00',
      scores: { activity: 2, breath: 2, circulation: 2, conscious: 2, spo2: 2 }, scoreTotal: 10, level: '≥9 可离室', status: 'signed', signature: 'sig-wang-a003',
      timeline: [
        { action: 'created', operator: '王麻醉师', role: 'anesthesiologist', at: '2026-10-21T08:20:00+08:00' },
        { action: 'submitted', operator: '王麻醉师', role: 'anesthesiologist', at: '2026-10-21T08:24:00+08:00' },
        { action: 'signed', operator: '刘主任', role: 'anesthesiologist', at: '2026-10-21T08:30:00+08:00' },
      ],
    },
    {
      id: 'AS-004', visitId: 'V2026102104', patientId: 'P10004', scaleKey: 'braden',
      assessorId: 'N004', assessorName: '赵护士', assessedAt: '2026-10-21T08:30:00+08:00',
      scores: { sensation: 4, moisture: 4, activity: 3, mobility: 3, nutrition: 4, friction: 3 }, scoreTotal: 21, level: '无风险', status: 'submitted', signature: 'sig-zhao-n004',
      timeline: [
        { action: 'created', operator: '赵护士', role: 'nurse', at: '2026-10-21T08:30:00+08:00' },
        { action: 'submitted', operator: '赵护士', role: 'nurse', at: '2026-10-21T08:38:00+08:00' },
      ],
    },
    {
      id: 'AS-005', visitId: 'V2026102105', patientId: 'P10005', scaleKey: 'morse',
      assessorId: 'N005', assessorName: '钱护士', assessedAt: '2026-10-21T08:40:00+08:00',
      scores: { fall_history: 0, secondary_diag: 0, ambulance: 0, iv: 0, gait: 0, cognition: 0 }, scoreTotal: 0, level: '低危', status: 'draft', signature: null,
      timeline: [
        { action: 'created', operator: '钱护士', role: 'nurse', at: '2026-10-21T08:40:00+08:00' },
      ],
    },
    {
      id: 'AS-006', visitId: 'V2026102106', patientId: 'P10006', scaleKey: 'nrs',
      assessorId: 'B006', assessorName: '陈医师', assessedAt: '2026-10-21T08:45:00+08:00',
      scores: { nrs: 3 }, scoreTotal: 3, level: '轻度疼痛', status: 'signed', signature: 'sig-chen-b006',
      timeline: [
        { action: 'created', operator: '陈医师', role: 'physician', at: '2026-10-21T08:45:00+08:00' },
        { action: 'submitted', operator: '陈医师', role: 'physician', at: '2026-10-21T08:50:00+08:00' },
        { action: 'signed', operator: '周主任', role: 'physician', at: '2026-10-21T08:56:00+08:00' },
      ],
    },
    {
      id: 'AS-007', visitId: 'V2026102107', patientId: 'P10007', scaleKey: 'nrs2002',
      assessorId: 'B007', assessorName: '孙医师', assessedAt: '2026-10-21T08:55:00+08:00',
      scores: { nutrition: 2, severity: 1, age: 0 }, scoreTotal: 3, level: '营养风险阳性', status: 'draft', signature: null,
      timeline: [
        { action: 'created', operator: '孙医师', role: 'physician', at: '2026-10-21T08:55:00+08:00' },
      ],
    },
    {
      id: 'AS-008', visitId: 'V2026102108', patientId: 'P10008', scaleKey: 'barthel',
      assessorId: 'N008', assessorName: '周护士', assessedAt: '2026-10-21T09:00:00+08:00',
      scores: { eat: 10, bath: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toilet: 10, transfer: 15, walk: 15, stairs: 10 }, scoreTotal: 100, level: '生活自理', status: 'signed', signature: 'sig-zhou-n008',
      timeline: [
        { action: 'created', operator: '周护士', role: 'nurse', at: '2026-10-21T09:00:00+08:00' },
        { action: 'submitted', operator: '周护士', role: 'nurse', at: '2026-10-21T09:08:00+08:00' },
        { action: 'signed', operator: '吴护士长', role: 'nurse', at: '2026-10-21T09:14:00+08:00' },
      ],
    },
    {
      id: 'AS-009', visitId: 'V2026102113', patientId: 'P10013', scaleKey: 'erTriage',
      assessorId: 'B009', assessorName: '郑医师', assessedAt: '2026-10-21T09:10:00+08:00',
      scores: { level3: 3 }, scoreTotal: 3, level: 'Ⅲ级 急症', status: 'rejected', signature: null,
      timeline: [
        { action: 'created', operator: '郑医师', role: 'physician', at: '2026-10-21T09:10:00+08:00' },
        { action: 'rejected', operator: '急诊科主任', role: 'physician', at: '2026-10-21T09:15:00+08:00' },
      ],
    },
    {
      id: 'AS-010', visitId: 'V2026102114', patientId: 'P10014', scaleKey: 'ais',
      assessorId: 'B010', assessorName: '冯医师', assessedAt: '2026-10-21T09:20:00+08:00',
      scores: { ais: 2 }, scoreTotal: 2, level: '轻度重伤', status: 'signed', signature: 'sig-feng-b010',
      timeline: [
        { action: 'created', operator: '冯医师', role: 'physician', at: '2026-10-21T09:20:00+08:00' },
        { action: 'submitted', operator: '冯医师', role: 'physician', at: '2026-10-21T09:25:00+08:00' },
        { action: 'signed', operator: '急诊主任', role: 'physician', at: '2026-10-21T09:31:00+08:00' },
      ],
    },
  ];
  seeds.forEach((r) => assessmentStore.set(r.id, r));
}
seedAssessments();

// ============================== 1. GET /api/v1/assessments 列表（scaleKey / visitId 过滤） ==============================

async function handleAssessmentList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const scaleKey = (c.query.get('scaleKey') ?? '').trim();
  const visitId = (c.query.get('visitId') ?? '').trim();
  let items = Array.from(assessmentStore.values());
  if (scaleKey) items = items.filter((r) => r.scaleKey === scaleKey);
  if (visitId) items = items.filter((r) => r.visitId === visitId);
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. GET /api/v1/assessments/:id 详情（404 兜底） ==============================

async function handleAssessmentDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const record = assessmentStore.get(id);
  if (!record) {
    return json({ code: 404, message: 'assessment not found' }, 404);
  }
  return json(ok(record));
}

// ============================== 3. POST /api/v1/assessments 新建（内存态短路，状态机 draft/submitted 不可越级） ==============================

async function handleAssessmentCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const visitId = typeof body.visitId === 'string' && body.visitId.trim() ? body.visitId.trim() : null;
  const patientId = typeof body.patientId === 'string' && body.patientId.trim() ? body.patientId.trim() : null;
  const scaleKey = body.scaleKey;
  const scores = body.scores;
  const level = typeof body.level === 'string' && body.level.trim() ? body.level.trim() : null;
  const assessorId = typeof body.assessorId === 'string' && body.assessorId.trim() ? body.assessorId.trim() : null;
  const assessorName = typeof body.assessorName === 'string' && body.assessorName.trim() ? body.assessorName.trim() : null;
  const signature = typeof body.signature === 'string' && body.signature.trim() ? body.signature.trim() : null;

  const scoresValid =
    scores !== null && typeof scores === 'object' && !Array.isArray(scores) &&
    Object.keys(scores as Record<string, unknown>).length > 0 &&
    Object.values(scores as Record<string, unknown>).every((v) => typeof v === 'number' && Number.isFinite(v));

  if (!visitId || !patientId || !level || !assessorId || !assessorName || !scoresValid || !SCALE_KEYS.includes(scaleKey as ScaleKey)) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const scoreMap = scores as Record<string, number>;
  const scoreTotal = Object.values(scoreMap).reduce((acc, v) => acc + v, 0);
  const now = new Date().toISOString();
  const status: AssessStatus = signature ? 'submitted' : 'draft';

  const timeline: TimelineEntry[] = [
    { action: 'created', operator: assessorName, role: 'physician', at: now },
  ];
  if (signature) {
    timeline.push({ action: 'submitted', operator: assessorName, role: 'physician', at: now });
  }

  assessmentSeq += 1;
  const record: AssessmentRecord = {
    id: `AS-${String(assessmentSeq).padStart(3, '0')}`,
    visitId,
    patientId,
    scaleKey: scaleKey as ScaleKey,
    assessorId,
    assessorName,
    assessedAt: now,
    scores: scoreMap,
    scoreTotal,
    level,
    status,
    signature,
    timeline,
  };
  assessmentStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m528Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/assessments', handle: handleAssessmentList, auth: true },
  { method: 'GET', path: '/api/v1/assessments/:id', handle: handleAssessmentDetail, auth: true },
  { method: 'POST', path: '/api/v1/assessments', handle: handleAssessmentCreate, auth: true },
];
