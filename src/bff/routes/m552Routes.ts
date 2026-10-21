/**
 * 健澜科技 jlmedaios - M552 新标准 P2：药品处方点评 GET+POST
 *
 * GET  /api/v1/prescription-reviews?deptCode=&result=   列表（reviewedAt 倒序；deptCode/result 过滤；信封含 summary.problemRate）
 * POST /api/v1/prescription-reviews                     新建点评（后端自动 hasProblem = reviewItems.length > 0）
 *
 * 种子 10 条：3 科室（internal/surgery/pediatrics），6 条 hasProblem=true、4 条 noProblem。
 * 内存数组短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type IssueType =
  | 'duplicate'
  | 'interaction'
  | 'dose_error'
  | 'indication_mismatch'
  | 'adverse_reaction'
  | 'contraindication';

type Severity = 'minor' | 'moderate' | 'major';

interface ReviewItem {
  drugCode: string;
  issueType: IssueType;
  severity: Severity;
  suggestion: string;
}

interface ReviewRecord {
  id: string;
  prescriptionId: string;
  deptCode: string;
  reviewDoctorId: string;
  reviewItems: ReviewItem[];
  hasProblem: boolean;
  reviewedAt: string;
}

interface ReviewSummary {
  totalReviewed: number;
  totalProblem: number;
  problemRate: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const prvStore: ReviewRecord[] = [];
let prvSeq = 0;

function addPrv(
  prescriptionId: string,
  deptCode: string,
  reviewDoctorId: string,
  items: ReviewItem[],
  reviewedAt: string,
): ReviewRecord {
  prvSeq += 1;
  const rec: ReviewRecord = {
    id: `PRV-${String(prvSeq).padStart(3, '0')}`,
    prescriptionId, deptCode, reviewDoctorId,
    reviewItems: items,
    hasProblem: items.length > 0,
    reviewedAt,
  };
  prvStore.push(rec);
  return rec;
}

function seedPrv(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 6 条 hasProblem=true
  addPrv('RX-2026-0001', 'internal', 'E-PHARMACIST-001', [
    { drugCode: 'WARFARIN', issueType: 'interaction', severity: 'major', suggestion: 'warfarin 与 aspirin 联用增加出血风险，建议复核抗凝指征' },
  ], iso(60 * 24));
  addPrv('RX-2026-0002', 'internal', 'E-PHARMACIST-001', [
    { drugCode: 'SIMVASTATIN', issueType: 'interaction', severity: 'moderate', suggestion: 'simvastatin 与 clarithromycin 联用增加横纹肌溶解风险' },
  ], iso(60 * 20));
  addPrv('RX-2026-0003', 'surgery', 'E-PHARMACIST-002', [
    { drugCode: 'METFORMIN', issueType: 'contraindication', severity: 'moderate', suggestion: '术后造影前后应停用 metformin 48h' },
  ], iso(60 * 12));
  addPrv('RX-2026-0004', 'pediatrics', 'E-PHARMACIST-003', [
    { drugCode: 'AMOXICILLIN', issueType: 'dose_error', severity: 'major', suggestion: '儿童剂量按体重复核偏高，建议按 mg/kg 重算' },
  ], iso(60 * 8));
  addPrv('RX-2026-0005', 'internal', 'E-PHARMACIST-001', [
    { drugCode: 'NSAID', issueType: 'adverse_reaction', severity: 'minor', suggestion: '75 岁以上老年患者 NSAID 胃肠道风险，建议选用选择性 COX-2 抑制剂' },
  ], iso(60 * 4));
  addPrv('RX-2026-0006', 'surgery', 'E-PHARMACIST-002', [
    { drugCode: 'CEFTRIAXONE', issueType: 'indication_mismatch', severity: 'moderate', suggestion: '无明确感染指征，预防用药疗程偏长' },
  ], iso(60 * 2));

  // 4 条 noProblem
  addPrv('RX-2026-0007', 'internal', 'E-PHARMACIST-001', [], iso(60 * 22));
  addPrv('RX-2026-0008', 'surgery', 'E-PHARMACIST-002', [], iso(60 * 16));
  addPrv('RX-2026-0009', 'pediatrics', 'E-PHARMACIST-003', [], iso(60 * 10));
  addPrv('RX-2026-0010', 'internal', 'E-PHARMACIST-001', [], iso(60 * 1));
}
seedPrv();

function buildSummary(rows: ReviewRecord[]): ReviewSummary {
  const totalReviewed = rows.length;
  const totalProblem = rows.filter((r) => r.hasProblem).length;
  const rate = totalReviewed === 0 ? '0%' : `${Math.round((totalProblem / totalReviewed) * 1000) / 10}%`;
  return { totalReviewed, totalProblem, problemRate: rate };
}

// ============================== 1. GET /api/v1/prescription-reviews ==============================

async function handlePrvList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  const result = (c.query.get('result') ?? '').trim();

  let rows = prvStore.slice();
  if (deptCode) rows = rows.filter((r) => r.deptCode === deptCode);
  if (result === 'problem') rows = rows.filter((r) => r.hasProblem);
  else if (result === 'noProblem') rows = rows.filter((r) => !r.hasProblem);

  rows = rows.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  return json(ok({ items: rows, totalCount: rows.length, summary: buildSummary(rows) }), 200);
}

// ============================== 2. POST /api/v1/prescription-reviews ==============================

async function handlePrvCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const prescriptionId = body.prescriptionId;
  const deptCode = body.deptCode;
  const reviewDoctorId = body.reviewDoctorId;
  const reviewItems = body.reviewItems;

  if (
    typeof prescriptionId !== 'string' || !prescriptionId.trim() ||
    typeof deptCode !== 'string' || !deptCode.trim() ||
    typeof reviewDoctorId !== 'string' || !reviewDoctorId.trim() ||
    !Array.isArray(reviewItems)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const items: ReviewItem[] = (reviewItems as unknown[]).filter((x): x is ReviewItem => {
    if (!x || typeof x !== 'object') return false;
    const o = x as ReviewItem;
    return (
      typeof o.drugCode === 'string' && Boolean(o.drugCode) &&
      typeof o.issueType === 'string' &&
      typeof o.severity === 'string' &&
      typeof o.suggestion === 'string'
    );
  });

  const rec = addPrv(
    prescriptionId.trim(),
    deptCode.trim(),
    reviewDoctorId.trim(),
    items,
    new Date().toISOString(),
  );
  return json(ok(rec), 200);
}

export const m552Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/prescription-reviews', handle: handlePrvList, auth: true },
  { method: 'POST', path: '/api/v1/prescription-reviews', handle: handlePrvCreate, auth: true },
];
