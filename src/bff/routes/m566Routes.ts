/**
 * 健澜科技 jlmedaios - M566 新标准 P6：病历质控（仅新增 POST 新建 + GET /stats）
 *
 * 说明：GET /api/v1/medical-record-quality 已由既有 medicalRecordQualityV13.ts（V13 病案质量指标聚合，
 * 权限 medical-record-quality:read）注册在线，本路由文件**不重复注册**，仅补充：
 *
 * POST /api/v1/medical-record-quality              新建质控记录（自动 grade + unqualified）
 * GET  /api/v1/medical-record-quality/stats         汇总（totalReviewed/averageScore/defectRate/gradeARate/byDept）
 *
 * 种子 12 份：internal/surgery/pediatrics/cardiology；7 A（≥90）+ 3 B（75-89）+ 2 C（<60）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Grade = 'A' | 'B' | 'C';
type Severity = 'minor' | 'moderate' | 'major';

interface QualityIssue {
  category: string;
  finding: string;
  severity: Severity;
}

interface MrqRecord {
  id: string;
  recordId: string;
  deptCode: string;
  qualifierId: string;
  score: number;
  grade: Grade;
  unqualified: boolean;
  issues: QualityIssue[];
  reviewedAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const mrqStore = new Map<string, MrqRecord>();
let mrqSeq = 0;

function gradeOf(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  return 'C';
}

function addMrq(r: Omit<MrqRecord, 'id' | 'grade' | 'unqualified'>): MrqRecord {
  mrqSeq += 1;
  const grade = gradeOf(r.score);
  const rec: MrqRecord = {
    ...r,
    id: `MRQ-${String(mrqSeq).padStart(3, '0')}`,
    grade,
    unqualified: r.score < 60,
  };
  mrqStore.set(rec.id, rec);
  return rec;
}

function seedMrq(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 7 份甲级 A（≥90）
  addMrq({ recordId: 'EMR-001', deptCode: 'internal', qualifierId: 'QC-001', score: 96, issues: [], reviewedAt: iso(60 * 24 * 12) });
  addMrq({ recordId: 'EMR-002', deptCode: 'internal', qualifierId: 'QC-001', score: 92, issues: [{ category: '病程记录', finding: '三级医师查房间隔 5 天', severity: 'minor' }], reviewedAt: iso(60 * 24 * 11) });
  addMrq({ recordId: 'EMR-003', deptCode: 'surgery', qualifierId: 'QC-002', score: 98, issues: [], reviewedAt: iso(60 * 24 * 10) });
  addMrq({ recordId: 'EMR-004', deptCode: 'surgery', qualifierId: 'QC-002', score: 91, issues: [{ category: '手术记录', finding: '术中出血量描述简略', severity: 'minor' }], reviewedAt: iso(60 * 24 * 9) });
  addMrq({ recordId: 'EMR-005', deptCode: 'pediatrics', qualifierId: 'QC-003', score: 95, issues: [], reviewedAt: iso(60 * 24 * 8) });
  addMrq({ recordId: 'EMR-006', deptCode: 'cardiology', qualifierId: 'QC-004', score: 93, issues: [], reviewedAt: iso(60 * 24 * 7) });
  addMrq({ recordId: 'EMR-007', deptCode: 'cardiology', qualifierId: 'QC-004', score: 90, issues: [{ category: '知情同意书', finding: '签字时间晚于手术时间 1 小时', severity: 'moderate' }], reviewedAt: iso(60 * 24 * 6) });

  // 3 份乙级 B（75-89）
  addMrq({ recordId: 'EMR-008', deptCode: 'internal', qualifierId: 'QC-001', score: 85, issues: [{ category: '首次病程', finding: '8 小时未完成', severity: 'moderate' }], reviewedAt: iso(60 * 24 * 5) });
  addMrq({ recordId: 'EMR-009', deptCode: 'surgery', qualifierId: 'QC-002', score: 80, issues: [{ category: '医嘱', finding: '抗菌药物开具无适应证记录', severity: 'moderate' }], reviewedAt: iso(60 * 24 * 4) });
  addMrq({ recordId: 'EMR-010', deptCode: 'pediatrics', qualifierId: 'QC-003', score: 78, issues: [{ category: '会诊记录', finding: '会诊意见未及时记录', severity: 'minor' }], reviewedAt: iso(60 * 24 * 3) });

  // 2 份丙级 C（<60）
  addMrq({ recordId: 'EMR-011', deptCode: 'internal', qualifierId: 'QC-001', score: 55, issues: [{ category: '出院记录', finding: '死亡病例无死亡讨论', severity: 'major' }, { category: '首次病程', finding: '24 小时未完成', severity: 'major' }], reviewedAt: iso(60 * 24 * 2) });
  addMrq({ recordId: 'EMR-012', deptCode: 'cardiology', qualifierId: 'QC-004', score: 58, issues: [{ category: '手术安全核查', finding: '三方签字缺失', severity: 'major' }], reviewedAt: iso(60 * 24) });
}
seedMrq();

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

// ============================== 1. POST /api/v1/medical-record-quality ==============================

async function handleMrqCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { recordId, deptCode, qualifierId, score, issues } = body as Record<string, unknown>;

  if (
    typeof recordId !== 'string' || !recordId.trim() ||
    typeof deptCode !== 'string' || !deptCode.trim() ||
    typeof qualifierId !== 'string' || !qualifierId.trim() ||
    typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100 ||
    !Array.isArray(issues)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addMrq({
    recordId: recordId.trim(),
    deptCode: deptCode.trim(),
    qualifierId: qualifierId.trim(),
    score,
    issues: issues as QualityIssue[],
    reviewedAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 2. GET /api/v1/medical-record-quality/stats ==============================

async function handleMrqStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const all = Array.from(mrqStore.values());
  const totalReviewed = all.length;
  const avgScore = totalReviewed === 0 ? 0 : Math.round((all.reduce((s, r) => s + r.score, 0) / totalReviewed) * 10) / 10;
  const unqualifiedCount = all.filter((r) => r.unqualified).length;
  const gradeACount = all.filter((r) => r.grade === 'A').length;

  const deptMap = new Map<string, { total: number; sum: number; gradeACount: number; gradeCCount: number }>();
  for (const r of all) {
    const bucket = deptMap.get(r.deptCode) ?? { total: 0, sum: 0, gradeACount: 0, gradeCCount: 0 };
    bucket.total += 1;
    bucket.sum += r.score;
    if (r.grade === 'A') bucket.gradeACount += 1;
    if (r.grade === 'C') bucket.gradeCCount += 1;
    deptMap.set(r.deptCode, bucket);
  }
  const byDept = Array.from(deptMap.entries()).map(([deptCode, v]) => ({
    deptCode,
    total: v.total,
    avgScore: v.total === 0 ? 0 : Math.round((v.sum / v.total) * 10) / 10,
    gradeACount: v.gradeACount,
    gradeCCount: v.gradeCCount,
  }));

  return json(ok({
    totalReviewed,
    averageScore: avgScore,
    defectRate: pct(unqualifiedCount, totalReviewed),
    gradeARate: pct(gradeACount, totalReviewed),
    byDept,
  }), 200);
}

export const m566Routes: RouteDef[] = [
  // GET /api/v1/medical-record-quality 已由既有 medicalRecordQualityV13.ts 注册（V13 指标聚合，权限 guarded），本文件不重复注册
  // /stats 静态路径先于列表注册（本文件无 :id 动态路由）
  { method: 'GET', path: '/api/v1/medical-record-quality/stats', handle: handleMrqStats, auth: true },
  { method: 'POST', path: '/api/v1/medical-record-quality', handle: handleMrqCreate, auth: true },
];
