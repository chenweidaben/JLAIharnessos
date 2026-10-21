/**
 * 健澜科技 jlmedaios - M563 新标准 P5：合理用药 AMS 专项点评 3 端点（含 stats 汇总）
 *
 * GET  /api/v1/ams-reviews?deptCode=&drugCategory=   列表（reviewedAt 倒序；过滤参数）
 * POST /api/v1/ams-reviews                          新建（缺必填/枚举非法→400）
 * GET  /api/v1/ams-reviews/stats                    汇总（totalReviews/passRate/rejectRate/byDept/byCategory）
 *
 * 种子 15 条：antibacterial 8 + anticoagulant 4 + psychotropic 3；
 *             分布 internal/surgery/icu/pediatrics；11 pass / 2 warn / 2 reject（passRate 73.3%、rejectRate 13.3%）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DrugCategory = 'antibacterial' | 'anticoagulant' | 'psychotropic';
const CATEGORIES: DrugCategory[] = ['antibacterial', 'anticoagulant', 'psychotropic'];

type ReviewResult = 'pass' | 'warn' | 'reject';
const RESULTS: ReviewResult[] = ['pass', 'warn', 'reject'];

interface AmsRecord {
  id: string;
  patientId: string;
  prescriptionId: string;
  drugName: string;
  drugCategory: DrugCategory;
  reviewResult: ReviewResult;
  reviewComment: string;
  reviewer: string;
  deptCode: string;
  reviewedAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const amsStore = new Map<string, AmsRecord>();
let amsSeq = 0;

function addAms(r: Omit<AmsRecord, 'id'>): AmsRecord {
  amsSeq += 1;
  const rec: AmsRecord = { ...r, id: `AMS-${String(amsSeq).padStart(3, '0')}` };
  amsStore.set(rec.id, rec);
  return rec;
}

function seedAms(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // antibacterial 8 条（6 pass + 2 reject）
  addAms({ patientId: 'P-A001', prescriptionId: 'RX-001', drugName: '头孢呋辛', drugCategory: 'antibacterial', reviewResult: 'pass', reviewComment: '剂量疗程合规', reviewer: 'PHARM-001', deptCode: 'internal', reviewedAt: iso(60 * 24 * 15) });
  addAms({ patientId: 'P-A002', prescriptionId: 'RX-002', drugName: '左氧氟沙星', drugCategory: 'antibacterial', reviewResult: 'pass', reviewComment: '经验性用药合理', reviewer: 'PHARM-001', deptCode: 'internal', reviewedAt: iso(60 * 24 * 14) });
  addAms({ patientId: 'P-A003', prescriptionId: 'RX-003', drugName: '万古霉素', drugCategory: 'antibacterial', reviewResult: 'pass', reviewComment: '血药浓度监测合规', reviewer: 'PHARM-002', deptCode: 'icu', reviewedAt: iso(60 * 24 * 13) });
  addAms({ patientId: 'P-A004', prescriptionId: 'RX-004', drugName: '美罗培南', drugCategory: 'antibacterial', reviewResult: 'reject', reviewComment: '无微生物学依据，越级使用', reviewer: 'PHARM-002', deptCode: 'icu', reviewedAt: iso(60 * 24 * 12) });
  addAms({ patientId: 'P-A005', prescriptionId: 'RX-005', drugName: '阿莫西林克拉维酸', drugCategory: 'antibacterial', reviewResult: 'pass', reviewComment: '疗程 7 天合规', reviewer: 'PHARM-001', deptCode: 'pediatrics', reviewedAt: iso(60 * 24 * 11) });
  addAms({ patientId: 'P-A006', prescriptionId: 'RX-006', drugName: '阿奇霉素', drugCategory: 'antibacterial', reviewResult: 'pass', reviewComment: '儿童剂量正确', reviewer: 'PHARM-003', deptCode: 'pediatrics', reviewedAt: iso(60 * 24 * 10) });
  addAms({ patientId: 'P-A007', prescriptionId: 'RX-007', drugName: '头孢哌酮舒巴坦', drugCategory: 'antibacterial', reviewResult: 'reject', reviewComment: '无指征联用，建议降级', reviewer: 'PHARM-002', deptCode: 'surgery', reviewedAt: iso(60 * 24 * 9) });
  addAms({ patientId: 'P-A008', prescriptionId: 'RX-008', drugName: '甲硝唑', drugCategory: 'antibacterial', reviewResult: 'pass', reviewComment: '围术期预防用药合规', reviewer: 'PHARM-003', deptCode: 'surgery', reviewedAt: iso(60 * 24 * 8) });

  // anticoagulant 4 条（3 pass + 1 warn）
  addAms({ patientId: 'P-A009', prescriptionId: 'RX-009', drugName: '低分子肝素', drugCategory: 'anticoagulant', reviewResult: 'pass', reviewComment: 'VTE 预防剂量合规', reviewer: 'PHARM-001', deptCode: 'surgery', reviewedAt: iso(60 * 24 * 7) });
  addAms({ patientId: 'P-A010', prescriptionId: 'RX-010', drugName: '华法林', drugCategory: 'anticoagulant', reviewResult: 'pass', reviewComment: 'INR 监测 2.1 合规', reviewer: 'PHARM-002', deptCode: 'internal', reviewedAt: iso(60 * 24 * 6) });
  addAms({ patientId: 'P-A011', prescriptionId: 'RX-011', drugName: '利伐沙班', drugCategory: 'anticoagulant', reviewResult: 'warn', reviewComment: '肾功能下降，剂量需调整', reviewer: 'PHARM-002', deptCode: 'internal', reviewedAt: iso(60 * 24 * 5) });
  addAms({ patientId: 'P-A012', prescriptionId: 'RX-012', drugName: '阿加曲班', drugCategory: 'anticoagulant', reviewResult: 'pass', reviewComment: 'HIT 治疗合理', reviewer: 'PHARM-002', deptCode: 'icu', reviewedAt: iso(60 * 24 * 4) });

  // psychotropic 3 条（2 pass + 1 warn）
  addAms({ patientId: 'P-A013', prescriptionId: 'RX-013', drugName: '奥氮平', drugCategory: 'psychotropic', reviewResult: 'pass', reviewComment: '精神分裂症维持治疗合规', reviewer: 'PHARM-004', deptCode: 'internal', reviewedAt: iso(60 * 24 * 3) });
  addAms({ patientId: 'P-A014', prescriptionId: 'RX-014', drugName: '右佐匹克隆', drugCategory: 'psychotropic', reviewResult: 'warn', reviewComment: '老年人长期使用，建议评估依赖', reviewer: 'PHARM-004', deptCode: 'internal', reviewedAt: iso(60 * 24 * 2) });
  addAms({ patientId: 'P-A015', prescriptionId: 'RX-015', drugName: '氟西汀', drugCategory: 'psychotropic', reviewResult: 'pass', reviewComment: '抑郁急性期剂量合规', reviewer: 'PHARM-004', deptCode: 'internal', reviewedAt: iso(60 * 24) });
}
seedAms();

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

// ============================== 1. GET /api/v1/ams-reviews ==============================

async function handleAmsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  const drugCategory = (c.query.get('drugCategory') ?? '').trim();

  let rows = Array.from(amsStore.values());
  if (deptCode) rows = rows.filter((r) => r.deptCode === deptCode);
  if (drugCategory) rows = rows.filter((r) => r.drugCategory === drugCategory);
  rows = rows.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/ams-reviews ==============================

async function handleAmsCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, prescriptionId, drugName, drugCategory, reviewResult, reviewComment, reviewer, deptCode } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof prescriptionId !== 'string' || !prescriptionId.trim() ||
    typeof drugName !== 'string' || !drugName.trim() ||
    typeof drugCategory !== 'string' || !CATEGORIES.includes(drugCategory as DrugCategory) ||
    typeof reviewResult !== 'string' || !RESULTS.includes(reviewResult as ReviewResult) ||
    typeof reviewComment !== 'string' || !reviewComment.trim() ||
    typeof reviewer !== 'string' || !reviewer.trim() ||
    typeof deptCode !== 'string' || !deptCode.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addAms({
    patientId: patientId.trim(),
    prescriptionId: prescriptionId.trim(),
    drugName: drugName.trim(),
    drugCategory: drugCategory as DrugCategory,
    reviewResult: reviewResult as ReviewResult,
    reviewComment: reviewComment.trim(),
    reviewer: reviewer.trim(),
    deptCode: deptCode.trim(),
    reviewedAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. GET /api/v1/ams-reviews/stats ==============================

async function handleAmsStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const all = Array.from(amsStore.values());
  const totalReviews = all.length;
  const passCount = all.filter((r) => r.reviewResult === 'pass').length;
  const rejectCount = all.filter((r) => r.reviewResult === 'reject').length;

  // byDept
  const deptMap = new Map<string, { total: number; passCount: number; rejectCount: number }>();
  for (const r of all) {
    const bucket = deptMap.get(r.deptCode) ?? { total: 0, passCount: 0, rejectCount: 0 };
    bucket.total += 1;
    if (r.reviewResult === 'pass') bucket.passCount += 1;
    if (r.reviewResult === 'reject') bucket.rejectCount += 1;
    deptMap.set(r.deptCode, bucket);
  }
  const byDept = Array.from(deptMap.entries()).map(([deptCode, v]) => ({
    deptCode,
    total: v.total,
    passCount: v.passCount,
    rejectCount: v.rejectCount,
    passRate: pct(v.passCount, v.total),
  }));

  // byCategory
  const catMap = new Map<string, { total: number; passCount: number; rejectCount: number }>();
  for (const r of all) {
    const bucket = catMap.get(r.drugCategory) ?? { total: 0, passCount: 0, rejectCount: 0 };
    bucket.total += 1;
    if (r.reviewResult === 'pass') bucket.passCount += 1;
    if (r.reviewResult === 'reject') bucket.rejectCount += 1;
    catMap.set(r.drugCategory, bucket);
  }
  const byCategory = Array.from(catMap.entries()).map(([drugCategory, v]) => ({
    drugCategory,
    total: v.total,
    passCount: v.passCount,
    rejectCount: v.rejectCount,
    passRate: pct(v.passCount, v.total),
  }));

  return json(ok({
    totalReviews,
    passRate: pct(passCount, totalReviews),
    rejectRate: pct(rejectCount, totalReviews),
    byDept,
    byCategory,
  }), 200);
}

export const m563Routes: RouteDef[] = [
  // 注意：/stats 静态路径必须先于任何动态路径注册（本文件无 :id 动态路由，无遮蔽风险）
  { method: 'GET', path: '/api/v1/ams-reviews/stats', handle: handleAmsStats, auth: true },
  { method: 'GET', path: '/api/v1/ams-reviews', handle: handleAmsList, auth: true },
  { method: 'POST', path: '/api/v1/ams-reviews', handle: handleAmsCreate, auth: true },
];
