/**
 * 健澜科技 jlmedaios - M572 新标准 P7：检验检查申请闭环 4 端点
 *
 * GET  /api/v1/test-orders?patientId=&testType=&status=   列表（requestedAt 倒序；过滤；GET 自动 overdue：stat 级 1h 未报）
 * POST /api/v1/test-orders                              新建（status=requested）
 * POST /api/v1/test-orders/:id/report                    回报（requested→reported；重复 409 already_reported）
 * POST /api/v1/test-orders/:id/cancel                    取消（requested→cancelled；已 reported 409 already_reported；重复 409 already_cancelled）
 *
 * 种子 18 条：lab/imaging/pathology 三类；3 条 stat overdue（requestedAt=2 小时前未报告）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type TestType = 'lab' | 'imaging' | 'pathology';
const TEST_TYPES: TestType[] = ['lab', 'imaging', 'pathology'];

type Urgency = 'routine' | 'urgent' | 'stat';
const URGENCIES: Urgency[] = ['routine', 'urgent', 'stat'];

type ToStatus = 'requested' | 'reported' | 'cancelled';

interface ToRecord {
  id: string;
  patientId: string;
  testType: TestType;
  testItem: string;
  clinicalDiagnosis: string;
  urgency: Urgency;
  requestedBy: string;
  requestedAt: string;
  status: ToStatus;
  overdue: boolean;
  reportedBy: string | null;
  reportedAt: string | null;
  resultSummary: string | null;
  abnormalFlag: boolean | null;
  cancelReason: string | null;
  cancelledBy: string | null;
}

// ============================== 内存态库（DEMO 短路） ==============================

const toStore = new Map<string, ToRecord>();
let toSeq = 0;

function addTo(r: Omit<ToRecord, 'id'>): ToRecord {
  toSeq += 1;
  const rec: ToRecord = { ...r, id: `TO-${String(toSeq).padStart(3, '0')}` };
  toStore.set(rec.id, rec);
  return rec;
}

function seedTo(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 3 条 stat overdue（requestedAt=2 小时前未报告）
  addTo({ patientId: 'P-T001', testType: 'lab', testItem: '急查血常规', clinicalDiagnosis: '休克待查', urgency: 'stat', requestedBy: 'DOC-EM-001', requestedAt: iso(60 * 125), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });
  addTo({ patientId: 'P-T002', testType: 'imaging', testItem: '头颅 CT', clinicalDiagnosis: '急性卒中', urgency: 'stat', requestedBy: 'DOC-EM-002', requestedAt: iso(60 * 120), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });
  addTo({ patientId: 'P-T003', testType: 'lab', testItem: '心肌酶谱', clinicalDiagnosis: '急性心梗', urgency: 'stat', requestedBy: 'DOC-EM-003', requestedAt: iso(60 * 118), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });

  // 6 条 requested 未到期（stat/urgent/routine，<1h）
  addTo({ patientId: 'P-T004', testType: 'lab', testItem: '生化全项', clinicalDiagnosis: '糖尿病', urgency: 'routine', requestedBy: 'DOC-001', requestedAt: iso(30), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });
  addTo({ patientId: 'P-T005', testType: 'imaging', testItem: '胸部 X 线', clinicalDiagnosis: '肺炎', urgency: 'routine', requestedBy: 'DOC-002', requestedAt: iso(25), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });
  addTo({ patientId: 'P-T006', testType: 'pathology', testItem: '组织活检', clinicalDiagnosis: '占位待查', urgency: 'urgent', requestedBy: 'DOC-003', requestedAt: iso(20), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });
  addTo({ patientId: 'P-T007', testType: 'lab', testItem: '凝血四项', clinicalDiagnosis: '术前检查', urgency: 'routine', requestedBy: 'DOC-004', requestedAt: iso(15), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });
  addTo({ patientId: 'P-T008', testType: 'imaging', testItem: '腹部 B 超', clinicalDiagnosis: '腹痛', urgency: 'urgent', requestedBy: 'DOC-005', requestedAt: iso(10), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });
  addTo({ patientId: 'P-T009', testType: 'lab', testItem: '感染八项', clinicalDiagnosis: '入院筛查', urgency: 'routine', requestedBy: 'DOC-006', requestedAt: iso(5), status: 'requested', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: null, cancelledBy: null });

  // 6 条 reported
  for (let i = 10; i <= 15; i++) {
    const tType: TestType = i % 3 === 0 ? 'lab' : i % 3 === 1 ? 'imaging' : 'pathology';
    addTo({
      patientId: `P-T${String(i).padStart(3, '0')}`,
      testType: tType,
      testItem: tType === 'lab' ? '血常规' : tType === 'imaging' ? '心电图' : '冰冻切片',
      clinicalDiagnosis: '门诊常规',
      urgency: 'routine',
      requestedBy: 'DOC-OPD-001',
      requestedAt: iso(60 * 24 * (20 - i)),
      status: 'reported',
      overdue: false,
      reportedBy: 'LAB-TECH-001',
      reportedAt: iso(60 * 24 * (20 - i) - 60),
      resultSummary: tType === 'lab' ? 'WBC 偏高' : tType === 'imaging' ? '心肺未见异常' : '良性病变',
      abnormalFlag: i % 2 === 0,
      cancelReason: null,
      cancelledBy: null,
    });
  }

  // 3 条 cancelled
  addTo({ patientId: 'P-T016', testType: 'lab', testItem: '甲状腺功能', clinicalDiagnosis: '已转院', urgency: 'routine', requestedBy: 'DOC-007', requestedAt: iso(60 * 24 * 5), status: 'cancelled', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: '患者已转院', cancelledBy: 'DOC-007' });
  addTo({ patientId: 'P-T017', testType: 'imaging', testItem: 'MRI 增强', clinicalDiagnosis: '过敏禁忌', urgency: 'routine', requestedBy: 'DOC-008', requestedAt: iso(60 * 24 * 4), status: 'cancelled', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: '造影剂过敏', cancelledBy: 'DOC-008' });
  addTo({ patientId: 'P-T018', testType: 'pathology', testItem: '细胞学涂片', clinicalDiagnosis: '样本不合格', urgency: 'urgent', requestedBy: 'DOC-009', requestedAt: iso(60 * 24 * 3), status: 'cancelled', overdue: false, reportedBy: null, reportedAt: null, resultSummary: null, abnormalFlag: null, cancelReason: '样本采集失败', cancelledBy: 'DOC-009' });
}
seedTo();

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

/** GET 时实时计算 overdue（不落库）：stat + status=requested + requestedAt>1h 前 */
function withOverdue(r: ToRecord): ToRecord {
  const nowMs = Date.now();
  const reqMs = Date.parse(r.requestedAt);
  const overdue =
    r.urgency === 'stat' && r.status === 'requested' &&
    Number.isFinite(reqMs) && (nowMs - reqMs) > 60 * 60_000;
  return { ...r, overdue };
}

// ============================== 1. GET /api/v1/test-orders ==============================

async function handleToList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const testType = (c.query.get('testType') ?? '').trim();
  const status = (c.query.get('status') ?? '').trim();

  let rows = Array.from(toStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (testType) rows = rows.filter((r) => r.testType === testType);
  if (status) rows = rows.filter((r) => r.status === status);
  rows = rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const items = rows.map(withOverdue);
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. POST /api/v1/test-orders ==============================

async function handleToCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, testType, testItem, clinicalDiagnosis, urgency, requestedBy } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof testType !== 'string' || !TEST_TYPES.includes(testType as TestType) ||
    typeof testItem !== 'string' || !testItem.trim() ||
    typeof clinicalDiagnosis !== 'string' || !clinicalDiagnosis.trim() ||
    typeof urgency !== 'string' || !URGENCIES.includes(urgency as Urgency) ||
    typeof requestedBy !== 'string' || !requestedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addTo({
    patientId: patientId.trim(),
    testType: testType as TestType,
    testItem: testItem.trim(),
    clinicalDiagnosis: clinicalDiagnosis.trim(),
    urgency: urgency as Urgency,
    requestedBy: requestedBy.trim(),
    requestedAt: new Date().toISOString(),
    status: 'requested',
    overdue: false,
    reportedBy: null,
    reportedAt: null,
    resultSummary: null,
    abnormalFlag: null,
    cancelReason: null,
    cancelledBy: null,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/test-orders/:id/report ==============================

async function handleToReport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = toStore.get(id);
  if (!rec) return notFound('TestOrder', id);

  if (rec.status !== 'requested') {
    return json({ code: 409, message: 'already_reported' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const reportedBy = body.reportedBy;
  const resultSummary = body.resultSummary;
  const abnormalFlag = body.abnormalFlag;

  if (
    typeof reportedBy !== 'string' || !reportedBy.trim() ||
    typeof resultSummary !== 'string' || !resultSummary.trim() ||
    typeof abnormalFlag !== 'boolean'
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'reported';
  rec.overdue = false;
  rec.reportedBy = reportedBy.trim();
  rec.reportedAt = new Date().toISOString();
  rec.resultSummary = resultSummary.trim();
  rec.abnormalFlag = abnormalFlag;
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/test-orders/:id/cancel ==============================

async function handleToCancel(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = toStore.get(id);
  if (!rec) return notFound('TestOrder', id);

  if (rec.status === 'reported') {
    return json({ code: 409, message: 'already_reported' }, 409);
  }
  if (rec.status === 'cancelled') {
    return json({ code: 409, message: 'already_cancelled' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const cancelReason = body.cancelReason;
  const cancelledBy = body.cancelledBy;

  if (
    typeof cancelReason !== 'string' || !cancelReason.trim() ||
    typeof cancelledBy !== 'string' || !cancelledBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'cancelled';
  rec.cancelReason = cancelReason.trim();
  rec.cancelledBy = cancelledBy.trim();
  return json(ok(rec), 200);
}

export const m572Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/test-orders', handle: handleToList, auth: true },
  { method: 'POST', path: '/api/v1/test-orders', handle: handleToCreate, auth: true },
  { method: 'POST', path: '/api/v1/test-orders/:id/report', handle: handleToReport, auth: true },
  { method: 'POST', path: '/api/v1/test-orders/:id/cancel', handle: handleToCancel, auth: true },
];
