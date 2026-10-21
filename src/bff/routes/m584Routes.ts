/**
 * 健澜科技 jlmedaios - M584 新标准 P10：标准数据集上报 3 端点
 *
 * GET  /api/v1/h-reports?reportType=&period=   列表（createdAt 倒序；过滤）
 * POST /api/v1/h-reports/generate              生成（status=generated；id=HR- 前缀自增）
 * POST /api/v1/h-reports/:id/submit            上报（未 generated 409 must_generate_first；已 submitted 409 already_submitted）
 *
 * 种子 8 份：含 2 份月度已报（submitted），其余 draft/generated。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type ReportType = 'inpatient-summary' | 'outpatient-summary' | 'quality-indicator';
type HrStatus = 'draft' | 'generated' | 'submitted';

interface HrRecord {
  id: string;
  reportType: ReportType;
  period: string;
  status: HrStatus;
  generatedAt: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  targetSystem: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const hrStore = new Map<string, HrRecord>();
let hrSeq = 0;

function addHr(r: Omit<HrRecord, 'id'>): HrRecord {
  hrSeq += 1;
  const rec: HrRecord = { ...r, id: `HR-${String(hrSeq).padStart(3, '0')}` };
  hrStore.set(rec.id, rec);
  return rec;
}

function seedHr(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 2 submitted（月度已报）
  addHr({
    reportType: 'inpatient-summary', period: '2026-08', status: 'submitted',
    generatedAt: iso(60 * 24 * 40), submittedAt: iso(60 * 24 * 39),
    submittedBy: 'DOC-REPORT', targetSystem: '卫健委上报平台',
    createdAt: iso(60 * 24 * 40),
  });
  addHr({
    reportType: 'outpatient-summary', period: '2026-08', status: 'submitted',
    generatedAt: iso(60 * 24 * 40), submittedAt: iso(60 * 24 * 39),
    submittedBy: 'DOC-REPORT', targetSystem: '卫健委上报平台',
    createdAt: iso(60 * 24 * 40),
  });

  // 3 generated（已生成待上报）
  for (let i = 1; i <= 3; i++) {
    addHr({
      reportType: i === 1 ? 'inpatient-summary' : i === 2 ? 'outpatient-summary' : 'quality-indicator',
      period: '2026-09', status: 'generated',
      generatedAt: iso(60 * 24 * 5), submittedAt: null, submittedBy: null, targetSystem: null,
      createdAt: iso(60 * 24 * 6),
    });
  }

  // 3 draft（未生成）
  for (let i = 1; i <= 3; i++) {
    addHr({
      reportType: i === 1 ? 'inpatient-summary' : i === 2 ? 'outpatient-summary' : 'quality-indicator',
      period: '2026-10', status: 'draft',
      generatedAt: null, submittedAt: null, submittedBy: null, targetSystem: null,
      createdAt: iso(60 * 24 * 2),
    });
  }
}
seedHr();

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

const VALID_REPORT_TYPES: ReportType[] = ['inpatient-summary', 'outpatient-summary', 'quality-indicator'];

// ============================== 1. GET /api/v1/h-reports ==============================

async function handleHrList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const reportType = (c.query.get('reportType') ?? '').trim();
  const period = (c.query.get('period') ?? '').trim();

  let rows = Array.from(hrStore.values());
  if (reportType) rows = rows.filter((r) => r.reportType === reportType);
  if (period) rows = rows.filter((r) => r.period === period);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/h-reports/generate ==============================

async function handleHrGenerate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { reportType, period } = body as Record<string, unknown>;

  if (typeof period !== 'string' || !period.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof reportType !== 'string' || !VALID_REPORT_TYPES.includes(reportType as ReportType)) {
    return json({ code: 400, message: 'invalid_report_type' }, 400);
  }

  const nowIso = new Date().toISOString();
  const rec = addHr({
    reportType: reportType as ReportType,
    period: period.trim(),
    status: 'generated',
    generatedAt: nowIso,
    submittedAt: null,
    submittedBy: null,
    targetSystem: null,
    createdAt: nowIso,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/h-reports/:id/submit ==============================

async function handleHrSubmit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = hrStore.get(id);
  if (!rec) return notFound('HReport', id);

  // 未生成不能上报
  if (rec.status === 'draft') {
    return json({ code: 409, message: 'must_generate_first' }, 409);
  }
  // 已上报
  if (rec.status === 'submitted') {
    return json({ code: 409, message: 'already_submitted' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { submittedBy, targetSystem } = body as Record<string, unknown>;
  if (
    typeof submittedBy !== 'string' || !submittedBy.trim() ||
    typeof targetSystem !== 'string' || !targetSystem.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'submitted';
  rec.submittedAt = new Date().toISOString();
  rec.submittedBy = submittedBy.trim();
  rec.targetSystem = targetSystem.trim();
  return json(ok(rec), 200);
}

export const m584Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/h-reports', handle: handleHrList, auth: true },
  { method: 'POST', path: '/api/v1/h-reports/generate', handle: handleHrGenerate, auth: true },
  { method: 'POST', path: '/api/v1/h-reports/:id/submit', handle: handleHrSubmit, auth: true },
];
