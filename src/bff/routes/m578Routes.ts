/**
 * 健澜科技 jlmedaios - M578 新标准 P9：MDT 多学科会诊 4 端点
 *
 * GET  /api/v1/mdt-consults?patientId=&status=   列表（requestedAt 倒序；过滤）
 * POST /api/v1/mdt-consults                      新建申请（status=requested）
 * POST /api/v1/mdt-consults/:id/schedule         排期（requested→scheduled；重复 409 already_scheduled）
 * POST /api/v1/mdt-consults/:id/finalize         出具结论（未 schedule 409 must_schedule_first；scheduled→finalized；重复 409 already_finalized）
 *
 * 种子 8 例：5 肿瘤 + 3 疑难；requested/scheduled/finalized 三态覆盖。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type MdtStatus = 'requested' | 'scheduled' | 'finalized';

interface ParticipatingDept {
  deptCode: string;
  specialistName: string;
}

interface MdtRecord {
  id: string;
  patientId: string;
  visitId: string;
  requestDeptCode: string;
  reason: string;
  clinicalQuestion: string;
  participatingDepts: ParticipatingDept[];
  requestedAt: string;
  status: MdtStatus;
  scheduledAt: string | null;
  meetingRoom: string | null;
  moderator: string | null;
  consensusOpinion: string | null;
  followUpPlan: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const mdtStore = new Map<string, MdtRecord>();
let mdtSeq = 0;

function addMdt(r: Omit<MdtRecord, 'id'>): MdtRecord {
  mdtSeq += 1;
  const rec: MdtRecord = { ...r, id: `MDT-${String(mdtSeq).padStart(3, '0')}` };
  mdtStore.set(rec.id, rec);
  return rec;
}

function seedMdt(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  const tumorDepts: ParticipatingDept[] = [
    { deptCode: 'oncology', specialistName: 'DOC-ONC-001' },
    { deptCode: 'surgery', specialistName: 'DOC-SUR-001' },
    { deptCode: 'radiology', specialistName: 'DOC-RAD-001' },
    { deptCode: 'pathology', specialistName: 'DOC-PATH-001' },
  ];
  const diffDepts: ParticipatingDept[] = [
    { deptCode: 'internal', specialistName: 'DOC-INT-001' },
    { deptCode: 'neurology', specialistName: 'DOC-NEURO-001' },
    { deptCode: 'lab', specialistName: 'DOC-LAB-001' },
  ];

  // 3 requested（肿瘤）
  for (let i = 1; i <= 3; i++) {
    addMdt({
      patientId: `P-M${String(i).padStart(3, '0')}`,
      visitId: `V-${String(i).padStart(3, '0')}`,
      requestDeptCode: 'oncology',
      reason: i === 1 ? '晚期肺癌治疗方案选择' : i === 2 ? '胃癌术后复发' : '胰腺癌新辅助方案',
      clinicalQuestion: i === 1 ? '是否一线免疫治疗' : i === 2 ? '化疗还是靶向' : '是否可手术',
      participatingDepts: tumorDepts,
      requestedAt: iso(60 * 24 * (5 - i)),
      status: 'requested',
      scheduledAt: null,
      meetingRoom: null,
      moderator: null,
      consensusOpinion: null,
      followUpPlan: null,
      finalizedBy: null,
      finalizedAt: null,
      createdAt: iso(60 * 24 * (5 - i)),
    });
  }

  // 2 scheduled（肿瘤）
  for (let i = 4; i <= 5; i++) {
    addMdt({
      patientId: `P-M${String(i).padStart(3, '0')}`,
      visitId: `V-${String(i).padStart(3, '0')}`,
      requestDeptCode: 'oncology',
      reason: i === 4 ? '肝癌介入后评估' : '乳腺癌保乳决策',
      clinicalQuestion: i === 4 ? 'TACE 后是否继续' : '保乳还是全切',
      participatingDepts: tumorDepts,
      requestedAt: iso(60 * 24 * (10 - i)),
      status: 'scheduled',
      scheduledAt: iso(60 * 24 * (10 - i) - 60),
      meetingRoom: `MEET-ROOM-${i}`,
      moderator: 'DOC-ONC-CHIEF',
      consensusOpinion: null,
      followUpPlan: null,
      finalizedBy: null,
      finalizedAt: null,
      createdAt: iso(60 * 24 * (10 - i)),
    });
  }

  // 3 finalized（2 肿瘤 + 1 疑难）
  addMdt({
    patientId: 'P-M006', visitId: 'V-006', requestDeptCode: 'oncology',
    reason: '结肠癌术后辅助方案', clinicalQuestion: '是否需要化疗',
    participatingDepts: tumorDepts,
    requestedAt: iso(60 * 24 * 7), status: 'finalized',
    scheduledAt: iso(60 * 24 * 6), meetingRoom: 'MEET-ROOM-6', moderator: 'DOC-ONC-CHIEF',
    consensusOpinion: '建议术后辅助化疗 6 程', followUpPlan: '3 个月后复查 CT',
    finalizedBy: 'DOC-ONC-CHIEF', finalizedAt: iso(60 * 24 * 5),
    createdAt: iso(60 * 24 * 7),
  });
  addMdt({
    patientId: 'P-M007', visitId: 'V-007', requestDeptCode: 'oncology',
    reason: '食管癌放化疗决策', clinicalQuestion: '同步放化疗还是序贯',
    participatingDepts: tumorDepts,
    requestedAt: iso(60 * 24 * 6), status: 'finalized',
    scheduledAt: iso(60 * 24 * 5), meetingRoom: 'MEET-ROOM-7', moderator: 'DOC-ONC-CHIEF',
    consensusOpinion: '建议同步放化疗', followUpPlan: '每周血常规监测',
    finalizedBy: 'DOC-ONC-CHIEF', finalizedAt: iso(60 * 24 * 4),
    createdAt: iso(60 * 24 * 6),
  });
  addMdt({
    patientId: 'P-M008', visitId: 'V-008', requestDeptCode: 'internal',
    reason: '疑难发热待查', clinicalQuestion: '感染还是自身免疫病',
    participatingDepts: diffDepts,
    requestedAt: iso(60 * 24 * 5), status: 'finalized',
    scheduledAt: iso(60 * 24 * 4), meetingRoom: 'MEET-ROOM-8', moderator: 'DOC-INT-CHIEF',
    consensusOpinion: '倾向成人 Still 病', followUpPlan: '激素试验性治疗并复查',
    finalizedBy: 'DOC-INT-CHIEF', finalizedAt: iso(60 * 24 * 3),
    createdAt: iso(60 * 24 * 5),
  });
}
seedMdt();

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

// ============================== 1. GET /api/v1/mdt-consults ==============================

async function handleMdtList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const status = (c.query.get('status') ?? '').trim();

  let rows = Array.from(mdtStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (status) rows = rows.filter((r) => r.status === status);
  rows = rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/mdt-consults ==============================

async function handleMdtCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, visitId, requestDeptCode, reason, clinicalQuestion, participatingDepts } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof requestDeptCode !== 'string' || !requestDeptCode.trim() ||
    typeof reason !== 'string' || !reason.trim() ||
    typeof clinicalQuestion !== 'string' || !clinicalQuestion.trim() ||
    !Array.isArray(participatingDepts) || participatingDepts.length === 0
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const pds: ParticipatingDept[] = (participatingDepts as unknown[]).map((it) => {
    const o = it as Record<string, unknown>;
    return {
      deptCode: typeof o.deptCode === 'string' ? o.deptCode : '',
      specialistName: typeof o.specialistName === 'string' ? o.specialistName : '',
    };
  });

  const nowIso = new Date().toISOString();
  const rec = addMdt({
    patientId: patientId.trim(),
    visitId: visitId.trim(),
    requestDeptCode: requestDeptCode.trim(),
    reason: reason.trim(),
    clinicalQuestion: clinicalQuestion.trim(),
    participatingDepts: pds,
    requestedAt: nowIso,
    status: 'requested',
    scheduledAt: null,
    meetingRoom: null,
    moderator: null,
    consensusOpinion: null,
    followUpPlan: null,
    finalizedBy: null,
    finalizedAt: null,
    createdAt: nowIso,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/mdt-consults/:id/schedule ==============================

async function handleMdtSchedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = mdtStore.get(id);
  if (!rec) return notFound('MdtConsult', id);

  if (rec.status !== 'requested') {
    return json({ code: 409, message: 'already_scheduled' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { scheduledAt, meetingRoom, moderator } = body as Record<string, unknown>;

  if (
    typeof scheduledAt !== 'string' || !scheduledAt.trim() ||
    typeof meetingRoom !== 'string' || !meetingRoom.trim() ||
    typeof moderator !== 'string' || !moderator.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'scheduled';
  rec.scheduledAt = scheduledAt.trim();
  rec.meetingRoom = meetingRoom.trim();
  rec.moderator = moderator.trim();
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/mdt-consults/:id/finalize ==============================

async function handleMdtFinalize(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = mdtStore.get(id);
  if (!rec) return notFound('MdtConsult', id);

  if (rec.status === 'requested') {
    return json({ code: 409, message: 'must_schedule_first' }, 409);
  }
  if (rec.status === 'finalized') {
    return json({ code: 409, message: 'already_finalized' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { consensusOpinion, followUpPlan, finalizedBy } = body as Record<string, unknown>;

  if (
    typeof consensusOpinion !== 'string' || !consensusOpinion.trim() ||
    typeof followUpPlan !== 'string' || !followUpPlan.trim() ||
    typeof finalizedBy !== 'string' || !finalizedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'finalized';
  rec.consensusOpinion = consensusOpinion.trim();
  rec.followUpPlan = followUpPlan.trim();
  rec.finalizedBy = finalizedBy.trim();
  rec.finalizedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m578Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/mdt-consults', handle: handleMdtList, auth: true },
  { method: 'POST', path: '/api/v1/mdt-consults', handle: handleMdtCreate, auth: true },
  { method: 'POST', path: '/api/v1/mdt-consults/:id/schedule', handle: handleMdtSchedule, auth: true },
  { method: 'POST', path: '/api/v1/mdt-consults/:id/finalize', handle: handleMdtFinalize, auth: true },
];
