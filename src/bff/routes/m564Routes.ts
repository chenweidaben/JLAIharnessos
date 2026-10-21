/**
 * 健澜科技 jlmedaios - M564 新标准 P5：患者随访管理闭环 3 端点
 *
 * GET  /api/v1/follow-ups?patientId=&status=   列表（createdAt 倒序；过滤；GET 自动 overdue 判定）
 * POST /api/v1/follow-ups                      新建（status=scheduled；overdue=false）
 * POST /api/v1/follow-ups/:id/execute          执行（scheduled→executed；重复 409 already_executed）
 *
 * 种子 12 条：3 overdue（nextFollowUpDate 已过未执行）+ 5 scheduled 未到期 + 4 executed。
 * GET 时实时计算：status='scheduled' 且 nextFollowUpDate < now → overdue=true（不落库，每次计算）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type FollowUpType = 'phone' | 'outpatient' | 'home';
const TYPES: FollowUpType[] = ['phone', 'outpatient', 'home'];

type FuStatus = 'scheduled' | 'executed' | 'missed';

interface FuRecord {
  id: string;
  patientId: string;
  dischargeDate: string;
  nextFollowUpDate: string;
  followUpType: FollowUpType;
  assignedTo: string;
  notes: string;
  status: FuStatus;
  overdue: boolean;
  executedAt: string | null;
  findings: string | null;
  readmissionFlag: boolean | null;
  actionTaken: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const fuStore = new Map<string, FuRecord>();
let fuSeq = 0;

function addFu(r: Omit<FuRecord, 'id'>): FuRecord {
  fuSeq += 1;
  const rec: FuRecord = { ...r, id: `FU-${String(fuSeq).padStart(3, '0')}` };
  fuStore.set(rec.id, rec);
  return rec;
}

function seedFu(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const futureIso = (offsetMin: number): string => new Date(now + offsetMin * 60_000).toISOString();

  // 3 例 overdue（scheduled 且 nextFollowUpDate 已过）
  addFu({ patientId: 'P-F001', dischargeDate: iso(60 * 24 * 10), nextFollowUpDate: iso(60 * 24 * 2), followUpType: 'phone', assignedTo: 'NURSE-001', notes: '心梗术后 7 天随访', status: 'scheduled', overdue: false, executedAt: null, findings: null, readmissionFlag: null, actionTaken: null, createdAt: iso(60 * 24 * 9) });
  addFu({ patientId: 'P-F002', dischargeDate: iso(60 * 24 * 8), nextFollowUpDate: iso(60 * 24 * 1), followUpType: 'outpatient', assignedTo: 'NURSE-002', notes: '糖尿病出院复诊', status: 'scheduled', overdue: false, executedAt: null, findings: null, readmissionFlag: null, actionTaken: null, createdAt: iso(60 * 24 * 7) });
  addFu({ patientId: 'P-F003', dischargeDate: iso(60 * 24 * 6), nextFollowUpDate: iso(60 * 12), followUpType: 'home', assignedTo: 'NURSE-003', notes: '术后居家访视', status: 'scheduled', overdue: false, executedAt: null, findings: null, readmissionFlag: null, actionTaken: null, createdAt: iso(60 * 24 * 5) });

  // 5 例 scheduled 未到期
  addFu({ patientId: 'P-F004', dischargeDate: iso(60 * 24 * 3), nextFollowUpDate: futureIso(60 * 24 * 5), followUpType: 'phone', assignedTo: 'NURSE-001', notes: '肺炎出院电话随访', status: 'scheduled', overdue: false, executedAt: null, findings: null, readmissionFlag: null, actionTaken: null, createdAt: iso(60 * 24 * 2) });
  addFu({ patientId: 'P-F005', dischargeDate: iso(60 * 24 * 3), nextFollowUpDate: futureIso(60 * 24 * 6), followUpType: 'outpatient', assignedTo: 'NURSE-002', notes: '胆囊切除术后复诊', status: 'scheduled', overdue: false, executedAt: null, findings: null, readmissionFlag: null, actionTaken: null, createdAt: iso(60 * 24 * 2) });
  addFu({ patientId: 'P-F006', dischargeDate: iso(60 * 24 * 2), nextFollowUpDate: futureIso(60 * 24 * 7), followUpType: 'phone', assignedTo: 'NURSE-003', notes: '慢阻肺稳定期随访', status: 'scheduled', overdue: false, executedAt: null, findings: null, readmissionFlag: null, actionTaken: null, createdAt: iso(60 * 24) });
  addFu({ patientId: 'P-F007', dischargeDate: iso(60 * 24 * 2), nextFollowUpDate: futureIso(60 * 24 * 8), followUpType: 'home', assignedTo: 'NURSE-001', notes: '老年患者居家访视', status: 'scheduled', overdue: false, executedAt: null, findings: null, readmissionFlag: null, actionTaken: null, createdAt: iso(60 * 24) });
  addFu({ patientId: 'P-F008', dischargeDate: iso(60 * 24), nextFollowUpDate: futureIso(60 * 24 * 9), followUpType: 'outpatient', assignedTo: 'NURSE-002', notes: '小儿肺炎出院复诊', status: 'scheduled', overdue: false, executedAt: null, findings: null, readmissionFlag: null, actionTaken: null, createdAt: iso(60 * 12) });

  // 4 例 executed
  addFu({ patientId: 'P-F009', dischargeDate: iso(60 * 24 * 15), nextFollowUpDate: iso(60 * 24 * 10), followUpType: 'phone', assignedTo: 'NURSE-001', notes: '胃溃疡术后随访', status: 'executed', overdue: false, executedAt: iso(60 * 24 * 9), findings: '恢复良好', readmissionFlag: false, actionTaken: '继续当前用药', createdAt: iso(60 * 24 * 14) });
  addFu({ patientId: 'P-F010', dischargeDate: iso(60 * 24 * 14), nextFollowUpDate: iso(60 * 24 * 9), followUpType: 'outpatient', assignedTo: 'NURSE-002', notes: '高血压出院复诊', status: 'executed', overdue: false, executedAt: iso(60 * 24 * 8), findings: '血压 145/90', readmissionFlag: false, actionTaken: '调整降压药', createdAt: iso(60 * 24 * 13) });
  addFu({ patientId: 'P-F011', dischargeDate: iso(60 * 24 * 13), nextFollowUpDate: iso(60 * 24 * 8), followUpType: 'home', assignedTo: 'NURSE-003', notes: '脑卒中居家访视', status: 'executed', overdue: false, executedAt: iso(60 * 24 * 7), findings: '生活自理能力评估', readmissionFlag: false, actionTaken: '康复训练指导', createdAt: iso(60 * 24 * 12) });
  addFu({ patientId: 'P-F012', dischargeDate: iso(60 * 24 * 12), nextFollowUpDate: iso(60 * 24 * 7), followUpType: 'phone', assignedTo: 'NURSE-001', notes: '房颤抗凝随访', status: 'executed', overdue: false, executedAt: iso(60 * 24 * 6), findings: 'INR 2.0 稳定', readmissionFlag: false, actionTaken: '继续华法林', createdAt: iso(60 * 24 * 11) });
}
seedFu();

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

/** GET 时实时计算 overdue（不落库） */
function withOverdue(r: FuRecord): FuRecord {
  const nowMs = Date.now();
  const nextMs = Date.parse(r.nextFollowUpDate);
  const overdue = r.status === 'scheduled' && Number.isFinite(nextMs) && nextMs < nowMs;
  return { ...r, overdue };
}

// ============================== 1. GET /api/v1/follow-ups ==============================

async function handleFuList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const status = (c.query.get('status') ?? '').trim();

  let rows = Array.from(fuStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (status) rows = rows.filter((r) => r.status === status);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const items = rows.map(withOverdue);
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. POST /api/v1/follow-ups ==============================

async function handleFuCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, dischargeDate, nextFollowUpDate, followUpType, assignedTo, notes } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof dischargeDate !== 'string' || !dischargeDate.trim() ||
    typeof nextFollowUpDate !== 'string' || !nextFollowUpDate.trim() ||
    typeof followUpType !== 'string' || !TYPES.includes(followUpType as FollowUpType) ||
    typeof assignedTo !== 'string' || !assignedTo.trim() ||
    typeof notes !== 'string' || !notes.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addFu({
    patientId: patientId.trim(),
    dischargeDate: dischargeDate.trim(),
    nextFollowUpDate: nextFollowUpDate.trim(),
    followUpType: followUpType as FollowUpType,
    assignedTo: assignedTo.trim(),
    notes: notes.trim(),
    status: 'scheduled',
    overdue: false,
    executedAt: null,
    findings: null,
    readmissionFlag: null,
    actionTaken: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/follow-ups/:id/execute ==============================

async function handleFuExecute(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = fuStore.get(id);
  if (!rec) return notFound('FollowUp', id);

  if (rec.status !== 'scheduled') {
    return json({ code: 409, message: 'already_executed' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const findings = body.findings;
  const readmissionFlag = body.readmissionFlag;
  const actionTaken = body.actionTaken;

  if (typeof findings !== 'string' || !findings.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'executed';
  rec.overdue = false;
  rec.executedAt = new Date().toISOString();
  rec.findings = findings.trim();
  rec.readmissionFlag = typeof readmissionFlag === 'boolean' ? readmissionFlag : null;
  rec.actionTaken = typeof actionTaken === 'string' ? actionTaken.trim() : null;
  return json(ok(rec), 200);
}

export const m564Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/follow-ups', handle: handleFuList, auth: true },
  { method: 'POST', path: '/api/v1/follow-ups', handle: handleFuCreate, auth: true },
  { method: 'POST', path: '/api/v1/follow-ups/:id/execute', handle: handleFuExecute, auth: true },
];
