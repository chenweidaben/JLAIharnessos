/**
 * 健澜科技 jlmedaios - M599 新标准 P14：耗材管理 5 端点
 *
 * GET  /api/v1/supplies?category=&deptCode=          列表（requestedAt 倒序）
 * POST /api/v1/supplies/request                       申领（status=requested）
 * POST /api/v1/supplies/request/:id/approve           审批（requested→approved/rejected；implant 双人签字）
 * POST /api/v1/supplies/request/:id/issue             发料（approved→issued）
 * GET  /api/v1/supplies/stats                          汇总（byDept + byCategory）
 *
 * 种子 30 条申领单：含 5 条 implant 高值耗材。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Category = 'disposable' | 'implant' | 'protection' | 'cleaning';
type SupStatus = 'requested' | 'approved' | 'rejected' | 'issued';

interface SupRecord {
  id: string;
  supplyCode: string;
  supplyName: string;
  category: Category;
  quantity: number;
  requestDeptCode: string;
  requestedBy: string;
  requestedAt: string;
  status: SupStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  approveNote: string | null;
  secondApproverId: string | null;
  issuedBy: string | null;
  issuedAt: string | null;
  actualQuantity: number | null;
}

// ============================== 内存态库（DEMO 短路） ==============================

const supStore = new Map<string, SupRecord>();
let supSeq = 0;

function addSup(r: Omit<SupRecord, 'id'>): SupRecord {
  supSeq += 1;
  const rec: SupRecord = { ...r, id: `SUP-${String(supSeq).padStart(3, '0')}` };
  supStore.set(rec.id, rec);
  return rec;
}

function seedSup(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const categories: Category[] = ['disposable', 'implant', 'protection', 'cleaning'];
  const supplies = [
    { code: 'S-DIS-01', name: '一次性注射器' },
    { code: 'S-IMP-01', name: '冠脉支架' },
    { code: 'S-PRO-01', name: '医用口罩' },
    { code: 'S-CLE-01', name: '手术衣' },
  ];

  for (let i = 1; i <= 30; i++) {
    const isImplant = i <= 5; // 前 5 条 implant
    const cat: Category = isImplant ? 'implant' : categories[i % 4];
    const s = supplies[isImplant ? 1 : (i % 4)];
    // 前 10 条已审批（approved/rejected），中间 10 条已发料，其余 requested
    let status: SupStatus = 'requested';
    let approvedBy: string | null = null;
    let approvedAt: string | null = null;
    let secondApproverId: string | null = null;
    let issuedBy: string | null = null;
    let issuedAt: string | null = null;
    let actualQuantity: number | null = null;
    if (i <= 10) {
      status = 'approved';
      approvedBy = `DOC-APP-${(i % 5) + 1}`;
      approvedAt = iso(60 * 24 * (30 - i) - 60);
      if (isImplant) secondApproverId = `DOC-APP2-${(i % 5) + 1}`;
    }
    if (i <= 5) {
      status = 'issued';
      issuedBy = `DOC-WH-${(i % 3) + 1}`;
      issuedAt = iso(60 * 24 * (30 - i) - 120);
      actualQuantity = 10;
    }
    addSup({
      supplyCode: s.code,
      supplyName: s.name,
      category: cat,
      quantity: 10,
      requestDeptCode: `DEPT-${(i % 5) + 1}`,
      requestedBy: `DOC-REQ-${(i % 10) + 1}`,
      requestedAt: iso(60 * 24 * (30 - i)),
      status,
      approvedBy,
      approvedAt,
      approveNote: null,
      secondApproverId,
      issuedBy,
      issuedAt,
      actualQuantity,
    });
  }
}
seedSup();

const VALID_CATEGORIES: Category[] = ['disposable', 'implant', 'protection', 'cleaning'];

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` }],
    },
    404,
  );
}

// ============================== 1. GET /api/v1/supplies ==============================

async function handleSupList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const category = (c.query.get('category') ?? '').trim();
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  let rows = Array.from(supStore.values());
  if (category) rows = rows.filter((r) => r.category === category);
  if (deptCode) rows = rows.filter((r) => r.requestDeptCode === deptCode);
  rows = rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/supplies/request ==============================

async function handleSupRequest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { supplyCode, supplyName, category, quantity, requestDeptCode, requestedBy } =
    body as Record<string, unknown>;

  if (
    typeof supplyCode !== 'string' || !supplyCode.trim() ||
    typeof supplyName !== 'string' || !supplyName.trim() ||
    typeof quantity !== 'number' || quantity <= 0 ||
    typeof requestDeptCode !== 'string' || !requestDeptCode.trim() ||
    typeof requestedBy !== 'string' || !requestedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category as Category)) {
    return json({ code: 400, message: 'invalid_category' }, 400);
  }

  const now = new Date().toISOString();
  const rec = addSup({
    supplyCode: supplyCode.trim(),
    supplyName: supplyName.trim(),
    category: category as Category,
    quantity,
    requestDeptCode: requestDeptCode.trim(),
    requestedBy: requestedBy.trim(),
    requestedAt: now,
    status: 'requested',
    approvedBy: null,
    approvedAt: null,
    approveNote: null,
    secondApproverId: null,
    issuedBy: null,
    issuedAt: null,
    actualQuantity: null,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/supplies/request/:id/approve ==============================

async function handleSupApprove(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = supStore.get(id);
  if (!rec) return notFound('SupplyRequest', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { approvedBy, status, approveNote, secondApproverId } = body as Record<string, unknown>;
  if (typeof approvedBy !== 'string' || !approvedBy.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (status !== 'approved' && status !== 'rejected') {
    return json({ code: 400, message: 'invalid_status' }, 400);
  }

  // 状态机：requested→approved/rejected
  if (rec.status !== 'requested') {
    return json({ code: 409, message: 'already_processed' }, 409);
  }

  // implant 高值耗材必须双人签字
  if (rec.category === 'implant' && status === 'approved') {
    if (typeof secondApproverId !== 'string' || !secondApproverId.trim()) {
      return json({ code: 400, message: 'implant_requires_dual_signature' }, 400);
    }
    rec.secondApproverId = secondApproverId.trim();
  }

  rec.status = status as SupStatus;
  rec.approvedBy = approvedBy.trim();
  rec.approvedAt = new Date().toISOString();
  rec.approveNote = typeof approveNote === 'string' && approveNote.trim() ? approveNote.trim() : null;
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/supplies/request/:id/issue ==============================

async function handleSupIssue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = supStore.get(id);
  if (!rec) return notFound('SupplyRequest', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { issuedBy, actualQuantity } = body as Record<string, unknown>;
  if (typeof issuedBy !== 'string' || !issuedBy.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // 状态机：approved→issued
  if (rec.status !== 'approved') {
    return json({ code: 409, message: 'must_be_approved_first' }, 409);
  }

  rec.status = 'issued';
  rec.issuedBy = issuedBy.trim();
  rec.issuedAt = new Date().toISOString();
  rec.actualQuantity = typeof actualQuantity === 'number' ? actualQuantity : rec.quantity;
  return json(ok(rec), 200);
}

// ============================== 5. GET /api/v1/supplies/stats ==============================

async function handleSupStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rows = Array.from(supStore.values());
  const total = rows.length;
  const approvedCount = rows.filter((r) => r.status === 'approved' || r.status === 'issued').length;
  const approvalRate = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

  // byDept
  const dMap = new Map<string, { total: number; approved: number }>();
  for (const r of rows) {
    const cur = dMap.get(r.requestDeptCode) ?? { total: 0, approved: 0 };
    cur.total += 1;
    if (r.status === 'approved' || r.status === 'issued') cur.approved += 1;
    dMap.set(r.requestDeptCode, cur);
  }
  const byDept = Array.from(dMap.entries()).map(([deptCode, v]) => ({
    deptCode,
    total: v.total,
    approvalRate: v.total > 0 ? Math.round((v.approved / v.total) * 100) : 0,
  }));

  // byCategory
  const cMap = new Map<string, { total: number; approved: number }>();
  for (const r of rows) {
    const cur = cMap.get(r.category) ?? { total: 0, approved: 0 };
    cur.total += 1;
    if (r.status === 'approved' || r.status === 'issued') cur.approved += 1;
    cMap.set(r.category, cur);
  }
  const byCategory = Array.from(cMap.entries()).map(([category, v]) => ({
    category,
    total: v.total,
    approvalRate: v.total > 0 ? Math.round((v.approved / v.total) * 100) : 0,
  }));

  return json(ok({ totalRequests: total, approvalRate, byDept, byCategory }), 200);
}

export const m599Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/supplies', handle: handleSupList, auth: true },
  { method: 'POST', path: '/api/v1/supplies/request', handle: handleSupRequest, auth: true },
  { method: 'POST', path: '/api/v1/supplies/request/:id/approve', handle: handleSupApprove, auth: true },
  { method: 'POST', path: '/api/v1/supplies/request/:id/issue', handle: handleSupIssue, auth: true },
  { method: 'GET', path: '/api/v1/supplies/stats', handle: handleSupStats, auth: true },
];
