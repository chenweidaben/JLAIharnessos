/**
 * 健澜科技 jlmedaios - M548 新标准 P1：智慧服务三级报告查询与推送 3 端点
 *
 * GET  /api/v1/reports?patientId=&type=   报告列表（reportDate 倒序；patientId/type 双过滤）
 * GET  /api/v1/reports/:id                报告详情（id 不存在 → 404）
 * POST /api/v1/reports/:id/push           推送患者微信/App（已 sent/read → 409 already_pushed）
 *
 * 种子 6 份：3 labs + 2 imaging + 1 pathology，覆盖 3 患者。
 * 内存 Map 短路，不连 PostgreSQL；pushStatus: pending→sent→read。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type ReportType = 'labs' | 'imaging' | 'pathology';
type PushStatus = 'pending' | 'sent' | 'read';

interface Report {
  id: string;
  patientId: string;
  type: ReportType;
  title: string;
  department: string;
  reportDate: string;
  summary: string;
  pdfUrl: string;
  pushStatus: PushStatus;
  pushedAt: string | null;
}

// ============================== 内存种子（6 份） ==============================

const reportStore = new Map<string, Report>();

function seedReports(): void {
  const seeds: Report[] = [
    { id: 'RPT-001', patientId: 'P10001', type: 'labs', title: '血常规+生化全套', department: 'DEPT-LAB', reportDate: '2026-10-21T06:30:00+08:00', summary: 'WBC 6.5、Hb 145、K 4.2、Cr 82，均在参考范围。', pdfUrl: '/files/reports/RPT-001.pdf', pushStatus: 'pending', pushedAt: null },
    { id: 'RPT-002', patientId: 'P10001', type: 'imaging', title: '胸部 DR', department: 'DEPT-RAD', reportDate: '2026-10-21T10:15:00+08:00', summary: '双肺纹理清晰，心影大小正常。', pdfUrl: '/files/reports/RPT-002.pdf', pushStatus: 'pending', pushedAt: null },
    { id: 'RPT-003', patientId: 'P10002', type: 'labs', title: '凝血四项', department: 'DEPT-LAB', reportDate: '2026-10-19T06:30:00+08:00', summary: 'PT 12.1s、APTT 32s、INR 0.98。', pdfUrl: '/files/reports/RPT-003.pdf', pushStatus: 'sent', pushedAt: '2026-10-19T11:00:00+08:00' },
    { id: 'RPT-004', patientId: 'P10002', type: 'pathology', title: '右乳结节穿刺病理', department: 'DEPT-PATH', reportDate: '2026-10-20T15:30:00+08:00', summary: '纤维腺瘤，未见异型细胞。', pdfUrl: '/files/reports/RPT-004.pdf', pushStatus: 'pending', pushedAt: null },
    { id: 'RPT-005', patientId: 'P10003', type: 'labs', title: '急查心肌酶谱', department: 'DEPT-LAB', reportDate: '2026-10-20T16:45:00+08:00', summary: 'cTnI 0.02 ng/ml、CK-MB 正常。', pdfUrl: '/files/reports/RPT-005.pdf', pushStatus: 'read', pushedAt: '2026-10-20T17:30:00+08:00' },
    { id: 'RPT-006', patientId: 'P10003', type: 'imaging', title: '头颅 CT', department: 'DEPT-RAD', reportDate: '2026-10-20T17:00:00+08:00', summary: '未见出血、梗死占位性病变。', pdfUrl: '/files/reports/RPT-006.pdf', pushStatus: 'pending', pushedAt: null },
  ];
  for (const r of seeds) reportStore.set(r.id, r);
}
seedReports();

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

// ============================== 1. GET /api/v1/reports?patientId=&type= ==============================

async function handleReportList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const type = (c.query.get('type') ?? '').trim();
  let rows = Array.from(reportStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (type) rows = rows.filter((r) => r.type === type);
  rows = rows.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. GET /api/v1/reports/:id ==============================

async function handleReportGet(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const r = reportStore.get(id);
  if (!r) return notFound('Report', id);
  return json(ok(r), 200);
}

// ============================== 3. POST /api/v1/reports/:id/push ==============================

async function handleReportPush(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const r = reportStore.get(id);
  if (!r) return notFound('Report', id);
  if (r.pushStatus === 'sent' || r.pushStatus === 'read') {
    return json({ code: 409, message: 'already_pushed' }, 409);
  }
  r.pushStatus = 'sent';
  r.pushedAt = new Date().toISOString();
  return json(ok(r), 200);
}

export const m548Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/reports', handle: handleReportList, auth: true },
  { method: 'GET', path: '/api/v1/reports/:id', handle: handleReportGet, auth: true },
  { method: 'POST', path: '/api/v1/reports/:id/push', handle: handleReportPush, auth: true },
];
