/**
 * 健澜科技 jlmedaios - M587 新标准 P11：移动缴费 3 端点
 *
 * GET  /api/v1/payments?patientId=&status=   列表（createdAt 倒序；过滤）
 * POST /api/v1/payments                    新建（amount<=0 400 amount_must_positive；Demo 短路即 status=paid）
 * POST /api/v1/payments/:id/refund          退费（paid→refunded；已 refunded 409 already_refunded；refundAmount>amount 400 refund_exceeds_amount）
 *
 * 种子 15 条：含 2 笔已退费（refunded）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type FeeType = 'registration' | 'exam' | 'lab' | 'medicine' | 'bed';
type PayMethod = 'wechat' | 'alipay' | 'cash' | 'insurance';
type PayStatus = 'pending' | 'paid' | 'refunded';

interface PayRecord {
  id: string;
  patientId: string;
  billId: string;
  amount: number;
  feeType: FeeType;
  payMethod: PayMethod;
  paidAt: string;
  status: PayStatus;
  refundReason: string | null;
  refundAmount: number | null;
  refundedBy: string | null;
  refundedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const payStore = new Map<string, PayRecord>();
let paySeq = 0;

function addPay(r: Omit<PayRecord, 'id'>): PayRecord {
  paySeq += 1;
  const rec: PayRecord = { ...r, id: `PAY-${String(paySeq).padStart(3, '0')}` };
  payStore.set(rec.id, rec);
  return rec;
}

function seedPay(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  const feeTypes: FeeType[] = ['registration', 'exam', 'lab', 'medicine', 'bed'];
  const methods: PayMethod[] = ['wechat', 'alipay', 'cash', 'insurance'];

  // 2 笔已退费
  for (let i = 1; i <= 2; i++) {
    addPay({
      patientId: `P-P${String(i).padStart(3, '0')}`, billId: `BILL-${i}`,
      amount: 100 + i * 50, feeType: feeTypes[i - 1], payMethod: methods[i - 1],
      paidAt: iso(60 * 24 * 10),
      status: 'refunded',
      refundReason: '重复收费', refundAmount: 100 + i * 50,
      refundedBy: 'DOC-FIN', refundedAt: iso(60 * 24 * 5),
      createdAt: iso(60 * 24 * 10),
    });
  }

  // 13 笔已支付（paid）
  for (let i = 3; i <= 15; i++) {
    addPay({
      patientId: `P-P${String(i).padStart(3, '0')}`, billId: `BILL-${i}`,
      amount: 50 + i * 30, feeType: feeTypes[i % 5], payMethod: methods[i % 4],
      paidAt: iso(60 * 24 * (16 - i)),
      status: 'paid',
      refundReason: null, refundAmount: null, refundedBy: null, refundedAt: null,
      createdAt: iso(60 * 24 * (16 - i)),
    });
  }
}
seedPay();

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

const VALID_FEE_TYPES: FeeType[] = ['registration', 'exam', 'lab', 'medicine', 'bed'];
const VALID_PAY_METHODS: PayMethod[] = ['wechat', 'alipay', 'cash', 'insurance'];

// ============================== 1. GET /api/v1/payments ==============================

async function handlePayList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const status = (c.query.get('status') ?? '').trim();

  let rows = Array.from(payStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (status) rows = rows.filter((r) => r.status === status);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/payments ==============================

async function handlePayCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, billId, amount, feeType, payMethod } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof billId !== 'string' || !billId.trim() ||
    typeof amount !== 'number'
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof feeType !== 'string' || !VALID_FEE_TYPES.includes(feeType as FeeType)) {
    return json({ code: 400, message: 'invalid_fee_type' }, 400);
  }
  if (typeof payMethod !== 'string' || !VALID_PAY_METHODS.includes(payMethod as PayMethod)) {
    return json({ code: 400, message: 'invalid_pay_method' }, 400);
  }

  // amount 必须正数
  if (amount <= 0) {
    return json({ code: 400, message: 'amount_must_positive' }, 400);
  }

  const nowIso = new Date().toISOString();
  const rec = addPay({
    patientId: patientId.trim(),
    billId: billId.trim(),
    amount,
    feeType: feeType as FeeType,
    payMethod: payMethod as PayMethod,
    paidAt: nowIso,
    status: 'paid',
    refundReason: null, refundAmount: null, refundedBy: null, refundedAt: null,
    createdAt: nowIso,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/payments/:id/refund ==============================

async function handlePayRefund(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = payStore.get(id);
  if (!rec) return notFound('Payment', id);

  if (rec.status === 'refunded') {
    return json({ code: 409, message: 'already_refunded' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { refundReason, refundAmount, refundedBy } = body as Record<string, unknown>;

  if (
    typeof refundReason !== 'string' || !refundReason.trim() ||
    typeof refundedBy !== 'string' || !refundedBy.trim() ||
    typeof refundAmount !== 'number'
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // refundAmount 不能超过原 amount
  if (refundAmount > rec.amount) {
    return json({ code: 400, message: 'refund_exceeds_amount' }, 400);
  }

  rec.status = 'refunded';
  rec.refundReason = refundReason.trim();
  rec.refundAmount = refundAmount;
  rec.refundedBy = refundedBy.trim();
  rec.refundedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m587Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/payments', handle: handlePayList, auth: true },
  { method: 'POST', path: '/api/v1/payments', handle: handlePayCreate, auth: true },
  { method: 'POST', path: '/api/v1/payments/:id/refund', handle: handlePayRefund, auth: true },
];
