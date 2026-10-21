/**
 * 健澜科技 jlmedaios - M550 新标准 P2：危急值闭环 3 端点
 *
 * GET  /api/v1/critical-results?patientId=&ackStatus=   列表（reportedAt 倒序；GET 时自动检查未 ack >10min → overdue=true）
 * POST /api/v1/critical-results                        新建（status='reported'、reportedAt=now）
 * POST /api/v1/critical-results/:id/ack                医师确认（reported→acknowledged；clinicalAction 非空→actionTaken；重复 ack→409）
 *
 * 状态机：reported → acknowledged → actionTaken。
 * 种子 5 条：3 已 ack（含 actionTaken）、1 未 ack（1 分钟前 overdue=false）、1 超时（20 分钟前 overdue=true）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type CrStatus = 'reported' | 'acknowledged' | 'actionTaken';

interface CriticalResult {
  id: string;
  patientId: string;
  visitId: string;
  labResultCode: string;
  value: string;
  unit: string;
  labDept: string;
  reportedAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  clinicalAction: string | null;
  status: CrStatus;
  overdue: boolean;
}

// ============================== 内存态库（DEMO 短路） ==============================

const crStore = new Map<string, CriticalResult>();
let crSeq = 0;

function addCr(r: Omit<CriticalResult, 'id'>): CriticalResult {
  crSeq += 1;
  const rec: CriticalResult = { ...r, id: `CR-${String(crSeq).padStart(3, '0')}` };
  crStore.set(rec.id, rec);
  return rec;
}

function seedCr(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  // 3 已 ack
  addCr({ patientId: 'P-C001', visitId: 'V-C001', labResultCode: 'K', value: '6.8', unit: 'mmol/L', labDept: 'DEPT-LAB', reportedAt: iso(60 * 24), acknowledgedBy: 'E-DR-001', acknowledgedAt: iso(60 * 23), clinicalAction: '停用 ACEi，复查电解质', status: 'actionTaken', overdue: false });
  addCr({ patientId: 'P-C002', visitId: 'V-C002', labResultCode: 'PLT', value: '35', unit: '10^9/L', labDept: 'DEPT-LAB', reportedAt: iso(120), acknowledgedBy: 'E-DR-002', acknowledgedAt: iso(118), clinicalAction: null, status: 'acknowledged', overdue: false });
  addCr({ patientId: 'P-C003', visitId: 'V-C003', labResultCode: 'GLU', value: '1.8', unit: 'mmol/L', labDept: 'DEPT-LAB', reportedAt: iso(180), acknowledgedBy: 'E-DR-003', acknowledgedAt: iso(175), clinicalAction: '50% GS 静推，监测血糖', status: 'actionTaken', overdue: false });
  // 1 未 ack（1 分钟前）
  addCr({ patientId: 'P-C004', visitId: 'V-C004', labResultCode: 'K', value: '2.9', unit: 'mmol/L', labDept: 'DEPT-LAB', reportedAt: iso(1), acknowledgedBy: null, acknowledgedAt: null, clinicalAction: null, status: 'reported', overdue: false });
  // 1 超时（20 分钟前）
  addCr({ patientId: 'P-C005', visitId: 'V-C005', labResultCode: 'WBC', value: '1.2', unit: '10^9/L', labDept: 'DEPT-LAB', reportedAt: iso(20), acknowledgedBy: null, acknowledgedAt: null, clinicalAction: null, status: 'reported', overdue: true });
}
seedCr();

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

/** GET 时自动检查：reported>10min 且 status='reported' → overdue=true */
function refreshOverdue(rec: CriticalResult): void {
  if (rec.status === 'reported') {
    const elapsedMin = (Date.now() - Date.parse(rec.reportedAt)) / 60_000;
    rec.overdue = elapsedMin > 10;
  }
}

// ============================== 1. GET /api/v1/critical-results ==============================

async function handleCrList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const ackStatus = (c.query.get('ackStatus') ?? '').trim();

  let rows = Array.from(crStore.values());
  rows.forEach(refreshOverdue);
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (ackStatus === 'pending') rows = rows.filter((r) => r.status === 'reported' && !r.overdue);
  else if (ackStatus === 'acknowledged') rows = rows.filter((r) => r.status === 'acknowledged' || r.status === 'actionTaken');
  else if (ackStatus === 'overdue') rows = rows.filter((r) => r.overdue);

  rows = rows.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/critical-results ==============================

async function handleCrCreate(c: Ctx): Promise<Response> {
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
  const labResultCode = body.labResultCode;
  const value = body.value;
  const unit = body.unit;
  const labDept = body.labDept;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof labResultCode !== 'string' || !labResultCode.trim() ||
    typeof value !== 'string' || !value.trim() ||
    typeof unit !== 'string' || !unit.trim() ||
    typeof labDept !== 'string' || !labDept.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addCr({
    patientId: patientId.trim(),
    visitId: visitId.trim(),
    labResultCode: labResultCode.trim(),
    value: value.trim(),
    unit: unit.trim(),
    labDept: labDept.trim(),
    reportedAt: new Date().toISOString(),
    acknowledgedBy: null,
    acknowledgedAt: null,
    clinicalAction: null,
    status: 'reported',
    overdue: false,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/critical-results/:id/ack ==============================

async function handleCrAck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = crStore.get(id);
  if (!rec) return notFound('CriticalResult', id);

  if (rec.status === 'acknowledged' || rec.status === 'actionTaken') {
    return json({ code: 409, message: 'already_acknowledged' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const acknowledgedBy = body.acknowledgedBy;
  const clinicalAction = body.clinicalAction;
  if (typeof acknowledgedBy !== 'string' || !acknowledgedBy.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.acknowledgedBy = acknowledgedBy.trim();
  rec.acknowledgedAt = new Date().toISOString();
  if (typeof clinicalAction === 'string' && clinicalAction.trim()) {
    rec.clinicalAction = clinicalAction.trim();
    rec.status = 'actionTaken';
  } else {
    rec.status = 'acknowledged';
  }
  rec.overdue = false;
  return json(ok(rec), 200);
}

export const m550Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/critical-results', handle: handleCrList, auth: true },
  { method: 'POST', path: '/api/v1/critical-results', handle: handleCrCreate, auth: true },
  { method: 'POST', path: '/api/v1/critical-results/:id/ack', handle: handleCrAck, auth: true },
];
