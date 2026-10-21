/**
 * 健澜科技 jlmedaios - M600 新标准 P14：采购申请 5 端点
 *
 * GET  /api/v1/procurement/requests?status=&deptCode=   列表（createdAt 倒序）
 * POST /api/v1/procurement/requests                     新建（estimatedAmount=quantity*unitPrice）
 * POST /api/v1/procurement/requests/:id/approve          审批（>50000 需 hospital_director）
 * POST /api/v1/procurement/requests/:id/tender            招标（approved→tendered）
 * GET  /api/v1/procurement/requests/stats                 汇总（byAmountRange + byDept）
 *
 * 种子 20 条：含 3 条 estimatedAmount>50000（需 hospital_director）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Category = 'drug' | 'supply' | 'equipment' | 'furniture';
type PrStatus = 'pending' | 'approved' | 'rejected' | 'tendered';
type ApprovalLevel = 'dept_head' | 'hospital_director';

interface PrRecord {
  id: string;
  itemName: string;
  category: Category;
  specification: string;
  estimatedQuantity: number;
  estimatedUnitPrice: number;
  estimatedAmount: number;
  budgetCode: string;
  requestDeptCode: string;
  requestedBy: string;
  requestedJustification: string;
  status: PrStatus;
  approverId: string | null;
  approvedAt: string | null;
  approvalLevel: ApprovalLevel | null;
  approvalNote: string | null;
  tenderNo: string | null;
  tenderDate: string | null;
  winningSupplierId: string | null;
  contractAmount: number | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const prStore = new Map<string, PrRecord>();
let prSeq = 0;

function addPr(r: Omit<PrRecord, 'id'>): PrRecord {
  prSeq += 1;
  const rec: PrRecord = { ...r, id: `PR-${String(prSeq).padStart(3, '0')}` };
  prStore.set(rec.id, rec);
  return rec;
}

function seedPr(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const categories: Category[] = ['drug', 'supply', 'equipment', 'furniture'];
  const items = ['阿莫西林', '注射器', 'CT 机', '办公椅'];

  for (let i = 1; i <= 20; i++) {
    const isLarge = i <= 3; // 前 3 条大额 >50000
    const qty = isLarge ? 10 : 100;
    const unitPrice = isLarge ? 10000 : 50;
    const amount = qty * unitPrice;
    const cat: Category = isLarge ? 'equipment' : categories[i % 4];
    addPr({
      itemName: items[isLarge ? 2 : (i % 4)],
      category: cat,
      specification: `${(i % 3) + 1}型号`,
      estimatedQuantity: qty,
      estimatedUnitPrice: unitPrice,
      estimatedAmount: amount,
      budgetCode: `BUD-${(i % 5) + 1}`,
      requestDeptCode: `DEPT-${(i % 5) + 1}`,
      requestedBy: `DOC-PR-${(i % 10) + 1}`,
      requestedJustification: `理由${i}`,
      status: 'pending',
      approverId: null,
      approvedAt: null,
      approvalLevel: null,
      approvalNote: null,
      tenderNo: null,
      tenderDate: null,
      winningSupplierId: null,
      contractAmount: null,
      createdAt: iso(60 * 24 * (30 - i)),
    });
  }
}
seedPr();

const VALID_CATEGORIES: Category[] = ['drug', 'supply', 'equipment', 'furniture'];

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` }],
    },
    404,
  );
}

// ============================== 1. GET /api/v1/procurement/requests ==============================

async function handlePrList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const status = (c.query.get('status') ?? '').trim();
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  let rows = Array.from(prStore.values());
  if (status) rows = rows.filter((r) => r.status === status);
  if (deptCode) rows = rows.filter((r) => r.requestDeptCode === deptCode);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/procurement/requests ==============================

async function handlePrCreate(c: Ctx): Promise<Response> {
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
    itemName, category, specification, estimatedQuantity, estimatedUnitPrice,
    budgetCode, requestDeptCode, requestedBy, requestedJustification,
  } = body as Record<string, unknown>;

  if (
    typeof itemName !== 'string' || !itemName.trim() ||
    typeof specification !== 'string' || !specification.trim() ||
    typeof estimatedQuantity !== 'number' || estimatedQuantity <= 0 ||
    typeof estimatedUnitPrice !== 'number' || estimatedUnitPrice <= 0 ||
    typeof budgetCode !== 'string' || !budgetCode.trim() ||
    typeof requestDeptCode !== 'string' || !requestDeptCode.trim() ||
    typeof requestedBy !== 'string' || !requestedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category as Category)) {
    return json({ code: 400, message: 'invalid_category' }, 400);
  }

  const now = new Date().toISOString();
  const rec = addPr({
    itemName: itemName.trim(),
    category: category as Category,
    specification: specification.trim(),
    estimatedQuantity,
    estimatedUnitPrice,
    estimatedAmount: Math.round(estimatedQuantity * estimatedUnitPrice * 100) / 100,
    budgetCode: budgetCode.trim(),
    requestDeptCode: requestDeptCode.trim(),
    requestedBy: requestedBy.trim(),
    requestedJustification: typeof requestedJustification === 'string' && requestedJustification.trim() ? requestedJustification.trim() : '',
    status: 'pending',
    approverId: null,
    approvedAt: null,
    approvalLevel: null,
    approvalNote: null,
    tenderNo: null,
    tenderDate: null,
    winningSupplierId: null,
    contractAmount: null,
    createdAt: now,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/procurement/requests/:id/approve ==============================

async function handlePrApprove(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = prStore.get(id);
  if (!rec) return notFound('ProcurementRequest', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { approverId, approvalLevel, status, approvalNote } = body as Record<string, unknown>;
  if (typeof approverId !== 'string' || !approverId.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (status !== 'approved' && status !== 'rejected') {
    return json({ code: 400, message: 'invalid_status' }, 400);
  }
  if (approvalLevel !== 'dept_head' && approvalLevel !== 'hospital_director') {
    return json({ code: 400, message: 'invalid_approval_level' }, 400);
  }

  // 大额（>50000）必须 hospital_director 审批
  if (rec.estimatedAmount > 50000 && approvalLevel !== 'hospital_director') {
    return json({ code: 400, message: 'requires_hospital_director_approval' }, 400);
  }

  rec.status = status as PrStatus;
  rec.approverId = approverId.trim();
  rec.approvedAt = new Date().toISOString();
  rec.approvalLevel = approvalLevel as ApprovalLevel;
  rec.approvalNote = typeof approvalNote === 'string' && approvalNote.trim() ? approvalNote.trim() : null;
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/procurement/requests/:id/tender ==============================

async function handlePrTender(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = prStore.get(id);
  if (!rec) return notFound('ProcurementRequest', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { tenderNo, tenderDate, winningSupplierId, contractAmount } = body as Record<string, unknown>;
  if (
    typeof tenderNo !== 'string' || !tenderNo.trim() ||
    typeof tenderDate !== 'string' || !tenderDate.trim() ||
    typeof winningSupplierId !== 'string' || !winningSupplierId.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // 状态机：approved→tendered
  if (rec.status !== 'approved') {
    return json({ code: 409, message: 'must_be_approved_first' }, 409);
  }
  if (rec.tenderNo) {
    return json({ code: 409, message: 'already_tendered' }, 409);
  }

  rec.tenderNo = tenderNo.trim();
  rec.tenderDate = tenderDate.trim();
  rec.winningSupplierId = winningSupplierId.trim();
  rec.contractAmount = typeof contractAmount === 'number' ? contractAmount : rec.estimatedAmount;
  rec.status = 'tendered';
  return json(ok(rec), 200);
}

// ============================== 5. GET /api/v1/procurement/requests/stats ==============================

async function handlePrStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rows = Array.from(prStore.values());
  const total = rows.length;

  // byAmountRange
  const ranges = [
    { label: '0-10000', min: 0, max: 10000 },
    { label: '10000-50000', min: 10000, max: 50000 },
    { label: '50000-100000', min: 50000, max: 100000 },
    { label: '100000+', min: 100000, max: Infinity },
  ];
  const byAmountRange = ranges.map((r) => ({
    range: r.label,
    count: rows.filter((x) => x.estimatedAmount >= r.min && x.estimatedAmount < r.max).length,
  }));

  // byDept
  const dMap = new Map<string, { total: number; amount: number }>();
  for (const r of rows) {
    const cur = dMap.get(r.requestDeptCode) ?? { total: 0, amount: 0 };
    cur.total += 1;
    cur.amount += r.estimatedAmount;
    dMap.set(r.requestDeptCode, cur);
  }
  const byDept = Array.from(dMap.entries()).map(([deptCode, v]) => ({
    deptCode,
    total: v.total,
    totalAmount: Math.round(v.amount * 100) / 100,
  }));

  return json(ok({ total, byAmountRange, byDept }), 200);
}

export const m600Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/procurement/requests', handle: handlePrList, auth: true },
  { method: 'POST', path: '/api/v1/procurement/requests', handle: handlePrCreate, auth: true },
  { method: 'POST', path: '/api/v1/procurement/requests/:id/approve', handle: handlePrApprove, auth: true },
  { method: 'POST', path: '/api/v1/procurement/requests/:id/tender', handle: handlePrTender, auth: true },
  { method: 'GET', path: '/api/v1/procurement/requests/stats', handle: handlePrStats, auth: true },
];
