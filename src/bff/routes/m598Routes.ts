/**
 * 健澜科技 jlmedaios - M598 新标准 P14：药品库存（去重补 4 端点）
 *
 * 去重说明：GET /api/v1/pharmacy/inventory 列表已由既有 m200/m304/pharmacy.ts 注册在线。
 *
 * 本文件只补缺失端点：
 *   POST /api/v1/pharmacy/inventory/receive    入库（batchNumber 唯一，重复 → 409 batch_duplicate）
 *   POST /api/v1/pharmacy/inventory/issue      出库（quantity>库存 → 400 insufficient_stock；过期批次 → 400 expired_batch_cannot_issue）
 *   GET  /api/v1/pharmacy/inventory/low-stock  低库存预警（quantity < safetyStock）
 *   GET  /api/v1/pharmacy/inventory/expiring  近效期预警（3 个月内到期且未过期）
 *
 * 种子 50 条：含 8 条低库存、5 条近效期。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

interface InvRecord {
  id: string;
  drugCode: string;
  drugName: string;
  specification: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  safetyStock: number;
  supplierId: string;
  receivedBy: string;
  receivedAt: string;
  isExpired: boolean;
}

// ============================== 内存态库（DEMO 短路） ==============================

const invStore = new Map<string, InvRecord>();
let invSeq = 0;

function addInv(r: Omit<InvRecord, 'id' | 'isExpired'>): InvRecord {
  invSeq += 1;
  const now = Date.now();
  const expMs = Date.parse(r.expiryDate);
  const rec: InvRecord = {
    ...r,
    id: `INV-${String(invSeq).padStart(3, '0')}`,
    isExpired: Number.isFinite(expMs) && expMs < now,
  };
  invStore.set(rec.id, rec);
  return rec;
}

function seedInv(): void {
  const now = Date.now();
  const iso = (offsetDays: number): string => new Date(now + offsetDays * 86_400_000).toISOString();
  const drugs = ['阿莫西林', '布洛芬', '二甲双胍', '氨氯地平', '阿托伐他汀', '氯吡格雷', '奥美拉唑', '依那普利'];

  for (let i = 1; i <= 50; i++) {
    const isLowStock = i <= 8; // 前 8 条低库存
    const isExpiring = i <= 5; // 前 5 条近效期（3 个月内）
    const expiryOffset = isExpiring ? 60 : isLowStock ? 400 : 400 + (i * 20);
    addInv({
      drugCode: `DRUG-${String(i).padStart(3, '0')}`,
      drugName: drugs[i % drugs.length],
      specification: `${(i % 3) + 1}粒/盒`,
      batchNumber: `BATCH-${String(i).padStart(4, '0')}`,
      expiryDate: iso(expiryOffset),
      quantity: isLowStock ? 20 : 100 + (i * 5),
      safetyStock: 50,
      supplierId: `SUP-${(i % 5) + 1}`,
      receivedBy: `DOC-PHARM-${(i % 10) + 1}`,
      receivedAt: new Date(now - i * 86_400_000).toISOString(),
    });
  }
}
seedInv();

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` }],
    },
    404,
  );
}

// ============================== 2. POST /api/v1/pharmacy/inventory/receive ==============================

async function handleReceive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { drugCode, drugName, specification, batchNumber, expiryDate, quantity, supplierId, receivedBy } =
    body as Record<string, unknown>;

  if (
    typeof drugCode !== 'string' || !drugCode.trim() ||
    typeof drugName !== 'string' || !drugName.trim() ||
    typeof specification !== 'string' || !specification.trim() ||
    typeof batchNumber !== 'string' || !batchNumber.trim() ||
    typeof expiryDate !== 'string' || !expiryDate.trim() ||
    typeof quantity !== 'number' || quantity <= 0 ||
    typeof supplierId !== 'string' || !supplierId.trim() ||
    typeof receivedBy !== 'string' || !receivedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // batchNumber 唯一
  for (const rec of invStore.values()) {
    if (rec.batchNumber === batchNumber.trim()) {
      return json({ code: 409, message: 'batch_duplicate' }, 409);
    }
  }

  const now = new Date().toISOString();
  const rec = addInv({
    drugCode: drugCode.trim(),
    drugName: drugName.trim(),
    specification: specification.trim(),
    batchNumber: batchNumber.trim(),
    expiryDate: expiryDate.trim(),
    quantity,
    safetyStock: 50,
    supplierId: supplierId.trim(),
    receivedBy: receivedBy.trim(),
    receivedAt: now,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/pharmacy/inventory/issue ==============================

async function handleIssue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { batchNumber, quantity, destination, issuedBy } = body as Record<string, unknown>;
  if (
    typeof batchNumber !== 'string' || !batchNumber.trim() ||
    typeof quantity !== 'number' || quantity <= 0 ||
    typeof destination !== 'string' || !destination.trim() ||
    typeof issuedBy !== 'string' || !issuedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // batchNumber 存在性
  let target: InvRecord | null = null;
  for (const rec of invStore.values()) {
    if (rec.batchNumber === batchNumber.trim()) {
      target = rec;
      break;
    }
  }
  if (!target) return notFound('Batch', batchNumber.trim());

  // 过期批次不能出库
  const now = Date.now();
  const expMs = Date.parse(target.expiryDate);
  if (Number.isFinite(expMs) && expMs < now) {
    return json({ code: 400, message: 'expired_batch_cannot_issue' }, 400);
  }

  // 库存校验
  if (quantity > target.quantity) {
    return json({ code: 400, message: 'insufficient_stock' }, 400);
  }

  target.quantity -= quantity;
  return json(ok({ ...target, issuedQuantity: quantity, destination: destination.trim(), issuedBy: issuedBy.trim() }), 200);
}

// ============================== 4. GET /api/v1/pharmacy/inventory/low-stock ==============================

async function handleLowStock(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const now = Date.now();
  const items = Array.from(invStore.values())
    .map((r) => ({
      ...r,
      isExpired: Number.isFinite(Date.parse(r.expiryDate)) && Date.parse(r.expiryDate) < now,
    }))
    .filter((r) => r.quantity < r.safetyStock);
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 5. GET /api/v1/pharmacy/inventory/expiring ==============================

async function handleExpiring(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const now = Date.now();
  const threeMonthsMs = 90 * 86_400_000;
  const items = Array.from(invStore.values())
    .map((r) => ({
      ...r,
      isExpired: Number.isFinite(Date.parse(r.expiryDate)) && Date.parse(r.expiryDate) < now,
    }))
    .filter((r) => {
      const expMs = Date.parse(r.expiryDate);
      return Number.isFinite(expMs) && expMs >= now && expMs - now <= threeMonthsMs;
    });
  return json(ok({ items, totalCount: items.length }), 200);
}

export const m598Routes: RouteDef[] = [
  // GET 列表已由 m200/m304/pharmacy.ts 注册在线，不重复
  { method: 'POST', path: '/api/v1/pharmacy/inventory/receive', handle: handleReceive, auth: true },
  { method: 'POST', path: '/api/v1/pharmacy/inventory/issue', handle: handleIssue, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/inventory/low-stock', handle: handleLowStock, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/inventory/expiring', handle: handleExpiring, auth: true },
];
