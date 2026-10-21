/**
 * 健澜科技 jlmedaios - M588 新标准 P11：报告查询推送（补缺失端点）
 *
 * 去重说明：GET /api/v1/reports、GET /api/v1/reports/:id、POST /api/v1/reports/:id/push
 * 已由既有 m548Routes 注册在线（智慧服务三级报告查询推送）。
 *
 * 本文件只补缺失端点：
 *   POST /api/v1/reports  —— 新建报告（reviewingDoctorAt 必须晚于 reportingDoctorAt）
 *
 * 种子 25 份：3 份已推送（pushedAt 非空）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type ReportType = 'lab' | 'imaging' | 'pathology';
type PushChannel = 'wechat' | 'sms' | 'app';

interface RptRecord {
  id: string;
  patientId: string;
  reportType: ReportType;
  reportTitle: string;
  reportContent: string;
  reportDate: string;
  reportingDoctor: string;
  reportingDoctorAt: string;
  reviewingDoctor: string;
  reviewingDoctorAt: string;
  pushChannel: PushChannel | null;
  pushedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const rptStore = new Map<string, RptRecord>();
let rptSeq = 0;

function addRpt(r: Omit<RptRecord, 'id'>): RptRecord {
  rptSeq += 1;
  const rec: RptRecord = { ...r, id: `RPT-${String(rptSeq).padStart(3, '0')}` };
  rptStore.set(rec.id, rec);
  return rec;
}

function seedRpt(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  const types: ReportType[] = ['lab', 'imaging', 'pathology'];

  // 25 份种子（3 份已推送）
  for (let i = 1; i <= 25; i++) {
    const reportedAt = iso(60 * 24 * (30 - i));
    const reviewedAt = iso(60 * 24 * (30 - i) - 30); // 审核晚于报告 30min
    const isPushed = i <= 3;
    addRpt({
      patientId: `P-R${String(i).padStart(3, '0')}`,
      reportType: types[i % 3],
      reportTitle: `报告${i}`,
      reportContent: `内容${i}`,
      reportDate: reportedAt,
      reportingDoctor: `DOC-RPT-${i % 10}`,
      reportingDoctorAt: reportedAt,
      reviewingDoctor: `DOC-REV-${i % 10}`,
      reviewingDoctorAt: reviewedAt,
      pushChannel: isPushed ? (['wechat', 'sms', 'app'] as PushChannel[])[i % 3] : null,
      pushedAt: isPushed ? iso(60 * 24 * (30 - i) - 60) : null,
      createdAt: reportedAt,
    });
  }
}
seedRpt();

const VALID_TYPES: ReportType[] = ['lab', 'imaging', 'pathology'];

// ============================== POST /api/v1/reports（新建） ==============================

async function handleRptCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const {
    patientId, reportType, reportTitle, reportContent, reportDate,
    reportingDoctor, reportingDoctorAt, reviewingDoctor, reviewingDoctorAt,
  } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof reportTitle !== 'string' || !reportTitle.trim() ||
    typeof reportContent !== 'string' || !reportContent.trim() ||
    typeof reportDate !== 'string' || !reportDate.trim() ||
    typeof reportingDoctor !== 'string' || !reportingDoctor.trim() ||
    typeof reportingDoctorAt !== 'string' || !reportingDoctorAt.trim() ||
    typeof reviewingDoctor !== 'string' || !reviewingDoctor.trim() ||
    typeof reviewingDoctorAt !== 'string' || !reviewingDoctorAt.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof reportType !== 'string' || !VALID_TYPES.includes(reportType as ReportType)) {
    return json({ code: 400, message: 'invalid_report_type' }, 400);
  }

  // reviewingDoctorAt 必须晚于 reportingDoctorAt
  const reportMs = Date.parse(reportingDoctorAt);
  const reviewMs = Date.parse(reviewingDoctorAt);
  if (Number.isFinite(reportMs) && Number.isFinite(reviewMs) && reviewMs <= reportMs) {
    return json({ code: 400, message: 'review_must_after_report' }, 400);
  }

  const rec = addRpt({
    patientId: patientId.trim(),
    reportType: reportType as ReportType,
    reportTitle: reportTitle.trim(),
    reportContent: reportContent.trim(),
    reportDate: reportDate.trim(),
    reportingDoctor: reportingDoctor.trim(),
    reportingDoctorAt: reportingDoctorAt.trim(),
    reviewingDoctor: reviewingDoctor.trim(),
    reviewingDoctorAt: reviewingDoctorAt.trim(),
    pushChannel: null,
    pushedAt: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

export const m588Routes: RouteDef[] = [
  // GET 列表 / GET :id / POST :id/push 已由 m548Routes 注册在线，不重复
  { method: 'POST', path: '/api/v1/reports', handle: handleRptCreate, auth: true },
];
