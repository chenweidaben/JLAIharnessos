/**
 * 健澜科技 jlmedaios - M601 新标准 P14：供应商管理 5 端点
 *
 * GET  /api/v1/suppliers?category=&certStatus=          列表（createdAt 倒序，自动判定 isExpired）
 * POST /api/v1/suppliers                              新建（businessLicenseNo 唯一）
 * POST /api/v1/suppliers/:id/audit                     资质审核（已 passed → 409 already_audited）
 * GET  /api/v1/suppliers/:id/performance               绩效（onTimeDeliveryRate/qualityPassRate/serviceScore）
 * POST /api/v1/suppliers/:id/blacklist                拉黑（isBlacklisted=true）
 *
 * 种子 25 家：含 3 家 expiryDate 已过（isExpired=true）、2 家已拉黑。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Category = 'drug' | 'supply' | 'equipment';
type AuditResult = 'passed' | 'pending' | 'rejected';

interface SupplierRecord {
  id: string;
  supplierName: string;
  unifiedSocialCreditCode: string;
  contactPerson: string;
  contactPhone: string;
  address: string;
  category: Category;
  businessLicenseNo: string;
  expiryDate: string;
  registeredCapital: number;
  isExpired: boolean;
  auditResult: AuditResult | null;
  auditNote: string | null;
  auditorId: string | null;
  auditedAt: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  blacklistedBy: string | null;
  blacklistedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const supStore = new Map<string, SupplierRecord>();
let supSeq = 0;

function addSupplier(r: Omit<SupplierRecord, 'id'>): SupplierRecord {
  supSeq += 1;
  const rec: SupplierRecord = { ...r, id: `SUP-${String(supSeq).padStart(3, '0')}` };
  supStore.set(rec.id, rec);
  return rec;
}

function seedSuppliers(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const categories: Category[] = ['drug', 'supply', 'equipment'];
  const names = ['国药控股', '华润医药', '迈瑞医疗', '联影医疗', '鱼跃医疗'];

  for (let i = 1; i <= 25; i++) {
    const isExpired = i <= 3; // 前 3 家过期
    const isBlacklisted = i <= 2; // 前 2 家拉黑
    const cat: Category = categories[i % 3];
    const expiryDate = isExpired
      ? iso(60 * 24 * 30 * 12) // 12 个月前
      : iso(-60 * 24 * 30 * 12); // 12 个月后
    addSupplier({
      supplierName: `${names[i % 5]}-${i}`,
      unifiedSocialCreditCode: `USCC-${String(i).padStart(6, '0')}`,
      contactPerson: `联系人${i}`,
      contactPhone: `138${String(10000000 + i).padStart(8, '0')}`,
      address: `地址${i}`,
      category: cat,
      businessLicenseNo: `LIC-${String(i).padStart(6, '0')}`,
      expiryDate,
      registeredCapital: 1000000 * i,
      isExpired,
      auditResult: null,
      auditNote: null,
      auditorId: null,
      auditedAt: null,
      isBlacklisted,
      blacklistReason: isBlacklisted ? `违规${i}` : null,
      blacklistedBy: isBlacklisted ? `AUD-${(i % 3) + 1}` : null,
      blacklistedAt: isBlacklisted ? iso(60 * 24 * 15) : null,
      createdAt: iso(60 * 24 * (30 - i)),
    });
  }
}
seedSuppliers();

const VALID_CATEGORIES: Category[] = ['drug', 'supply', 'equipment'];

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` }],
    },
    404,
  );
}

// ============================== 1. GET /api/v1/suppliers ==============================

async function handleSupplierList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const category = (c.query.get('category') ?? '').trim();
  const certStatus = (c.query.get('certStatus') ?? '').trim();
  const now = new Date().toISOString();
  let rows = Array.from(supStore.values());
  // 自动判定 isExpired
  rows = rows.map((r) => ({ ...r, isExpired: r.expiryDate < now }));
  if (category) rows = rows.filter((r) => r.category === category);
  if (certStatus === 'expired') rows = rows.filter((r) => r.isExpired);
  if (certStatus === 'valid') rows = rows.filter((r) => !r.isExpired);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/suppliers ==============================

async function handleSupplierCreate(c: Ctx): Promise<Response> {
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
    supplierName, unifiedSocialCreditCode, contactPerson, contactPhone, address,
    category, businessLicenseNo, expiryDate, registeredCapital,
  } = body as Record<string, unknown>;

  if (
    typeof supplierName !== 'string' || !supplierName.trim() ||
    typeof unifiedSocialCreditCode !== 'string' || !unifiedSocialCreditCode.trim() ||
    typeof contactPerson !== 'string' || !contactPerson.trim() ||
    typeof contactPhone !== 'string' || !contactPhone.trim() ||
    typeof address !== 'string' || !address.trim() ||
    typeof businessLicenseNo !== 'string' || !businessLicenseNo.trim() ||
    typeof expiryDate !== 'string' || !expiryDate.trim() ||
    typeof registeredCapital !== 'number' || registeredCapital < 0
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category as Category)) {
    return json({ code: 400, message: 'invalid_category' }, 400);
  }

  // businessLicenseNo 唯一
  for (const s of supStore.values()) {
    if (s.businessLicenseNo === businessLicenseNo.trim()) {
      return json({ code: 409, message: 'license_no_duplicate' }, 409);
    }
  }

  const now = new Date().toISOString();
  const rec = addSupplier({
    supplierName: supplierName.trim(),
    unifiedSocialCreditCode: unifiedSocialCreditCode.trim(),
    contactPerson: contactPerson.trim(),
    contactPhone: contactPhone.trim(),
    address: address.trim(),
    category: category as Category,
    businessLicenseNo: businessLicenseNo.trim(),
    expiryDate: expiryDate.trim(),
    registeredCapital,
    isExpired: expiryDate.trim() < now,
    auditResult: null,
    auditNote: null,
    auditorId: null,
    auditedAt: null,
    isBlacklisted: false,
    blacklistReason: null,
    blacklistedBy: null,
    blacklistedAt: null,
    createdAt: now,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/suppliers/:id/audit ==============================

async function handleSupplierAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = supStore.get(id);
  if (!rec) return notFound('Supplier', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { auditorId, auditResult, auditNote } = body as Record<string, unknown>;
  if (typeof auditorId !== 'string' || !auditorId.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (auditResult !== 'passed' && auditResult !== 'pending' && auditResult !== 'rejected') {
    return json({ code: 400, message: 'invalid_audit_result' }, 400);
  }

  // 已 passed → 409
  if (rec.auditResult === 'passed') {
    return json({ code: 409, message: 'already_audited' }, 409);
  }

  rec.auditResult = auditResult as AuditResult;
  rec.auditorId = auditorId.trim();
  rec.auditedAt = new Date().toISOString();
  rec.auditNote = typeof auditNote === 'string' && auditNote.trim() ? auditNote.trim() : null;
  return json(ok(rec), 200);
}

// ============================== 4. GET /api/v1/suppliers/:id/performance ==============================

async function handleSupplierPerformance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = supStore.get(id);
  if (!rec) return notFound('Supplier', id);

  // 基于种子数据计算（确定性伪随机）
  const seed = id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const onTimeDeliveryRate = 85 + (seed % 15); // 85-99
  const qualityPassRate = 90 + (seed % 10); // 90-99
  const serviceScore = 4.0 + ((seed % 10) / 10); // 4.0-4.9

  return json(ok({
    supplierId: id,
    onTimeDeliveryRate,
    qualityPassRate,
    serviceScore: Math.round(serviceScore * 10) / 10,
  }), 200);
}

// ============================== 5. POST /api/v1/suppliers/:id/blacklist ==============================

async function handleSupplierBlacklist(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = supStore.get(id);
  if (!rec) return notFound('Supplier', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { reason, blacklistedBy } = body as Record<string, unknown>;
  if (typeof reason !== 'string' || !reason.trim() || typeof blacklistedBy !== 'string' || !blacklistedBy.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.isBlacklisted = true;
  rec.blacklistReason = reason.trim();
  rec.blacklistedBy = blacklistedBy.trim();
  rec.blacklistedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m601Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/suppliers', handle: handleSupplierList, auth: true },
  { method: 'POST', path: '/api/v1/suppliers', handle: handleSupplierCreate, auth: true },
  { method: 'POST', path: '/api/v1/suppliers/:id/audit', handle: handleSupplierAudit, auth: true },
  { method: 'GET', path: '/api/v1/suppliers/:id/performance', handle: handleSupplierPerformance, auth: true },
  { method: 'POST', path: '/api/v1/suppliers/:id/blacklist', handle: handleSupplierBlacklist, auth: true },
];
