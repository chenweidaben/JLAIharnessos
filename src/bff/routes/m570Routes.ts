/**
 * 健澜科技 jlmedaios - M570 新标准 P7：医嘱闭环（仅新增 POST /:id/review 药师审核端点）
 *
 * 说明：GET /api/v1/orders、POST /api/v1/orders、POST /:id/cancel、POST /:id/execute、
 * GET /:id/executions 已由既有 order.ts（DB 后端 + 权限）注册在线，本路由文件**不重复注册**，
 * 仅补充真正缺失的药师审核状态机端点：
 *
 * POST /api/v1/orders/:id/review   药师审核（draft→reviewed approve；reject 直接置 cancelled；已 reviewed/executed/cancelled 409 already_reviewed）
 *
 * 种子 20 条内存医嘱（仅 review 状态机演示用）：5 medication + 8 lab + 4 imaging + 3 nursing；
 * 状态覆盖 draft/reviewed/executed/cancelled。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type OrderType = 'medication' | 'lab' | 'imaging' | 'procedure' | 'nursing';
const ORDER_TYPES: OrderType[] = ['medication', 'lab', 'imaging', 'procedure', 'nursing'];

type OrdStatus = 'draft' | 'reviewed' | 'executed' | 'cancelled';
type ReviewResult = 'approve' | 'reject';

interface OrdRecord {
  id: string;
  patientId: string;
  visitId: string;
  orderType: OrderType;
  content: string;
  dosage: string | null;
  frequency: string | null;
  startTime: string;
  endTime: string | null;
  orderedBy: string;
  orderedAt: string;
  status: OrdStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewResult: ReviewResult | null;
  reviewComment: string | null;
  executedBy: string | null;
  executedAt: string | null;
  executionResult: string | null;
}

// ============================== 内存态库（DEMO 短路） ==============================

const ordStore = new Map<string, OrdRecord>();
let ordSeq = 0;

function addOrd(r: Omit<OrdRecord, 'id'>): OrdRecord {
  ordSeq += 1;
  const rec: OrdRecord = { ...r, id: `ORD-${String(ordSeq).padStart(3, '0')}` };
  ordStore.set(rec.id, rec);
  return rec;
}

function seedOrd(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 5 medication
  addOrd({ patientId: 'P-O001', visitId: 'V-001', orderType: 'medication', content: '头孢呋辛', dosage: '0.75g', frequency: 'bid', startTime: '2026-10-22T08:00:00Z', endTime: '2026-10-28T08:00:00Z', orderedBy: 'DOC-001', orderedAt: iso(60 * 24 * 5), status: 'draft', reviewedBy: null, reviewedAt: null, reviewResult: null, reviewComment: null, executedBy: null, executedAt: null, executionResult: null });
  addOrd({ patientId: 'P-O002', visitId: 'V-002', orderType: 'medication', content: '左氧氟沙星', dosage: '0.5g', frequency: 'qd', startTime: '2026-10-22T08:00:00Z', endTime: '2026-10-27T08:00:00Z', orderedBy: 'DOC-002', orderedAt: iso(60 * 24 * 4), status: 'reviewed', reviewedBy: 'PHARM-001', reviewedAt: iso(60 * 24 * 3), reviewResult: 'approve', reviewComment: '剂量合规', executedBy: null, executedAt: null, executionResult: null });
  addOrd({ patientId: 'P-O003', visitId: 'V-003', orderType: 'medication', content: '阿司匹林', dosage: '100mg', frequency: 'qd', startTime: '2026-10-22T08:00:00Z', endTime: null, orderedBy: 'DOC-003', orderedAt: iso(60 * 24 * 4), status: 'executed', reviewedBy: 'PHARM-001', reviewedAt: iso(60 * 24 * 3), reviewResult: 'approve', reviewComment: null, executedBy: 'NURSE-001', executedAt: iso(60 * 24 * 2), executionResult: '已服用' });
  addOrd({ patientId: 'P-O004', visitId: 'V-004', orderType: 'medication', content: '万古霉素', dosage: '1g', frequency: 'q12h', startTime: '2026-10-22T08:00:00Z', endTime: '2026-10-25T08:00:00Z', orderedBy: 'DOC-004', orderedAt: iso(60 * 24 * 3), status: 'cancelled', reviewedBy: 'PHARM-002', reviewedAt: iso(60 * 24 * 2), reviewResult: 'reject', reviewComment: '肾功不全，禁用', executedBy: null, executedAt: null, executionResult: null });
  addOrd({ patientId: 'P-O005', visitId: 'V-005', orderType: 'medication', content: '奥美拉唑', dosage: '40mg', frequency: 'bid', startTime: '2026-10-22T08:00:00Z', endTime: '2026-10-29T08:00:00Z', orderedBy: 'DOC-005', orderedAt: iso(60 * 24 * 2), status: 'draft', reviewedBy: null, reviewedAt: null, reviewResult: null, reviewComment: null, executedBy: null, executedAt: null, executionResult: null });

  // 8 lab
  for (let i = 6; i <= 13; i++) {
    const status: OrdStatus = i % 4 === 0 ? 'executed' : i % 4 === 1 ? 'reviewed' : i % 4 === 2 ? 'draft' : 'cancelled';
    addOrd({
      patientId: `P-O${String(i).padStart(3, '0')}`,
      visitId: `V-${String(i).padStart(3, '0')}`,
      orderType: 'lab',
      content: i === 6 ? '血常规' : i === 7 ? '生化全项' : i === 8 ? '凝血四项' : i === 9 ? '血气分析' : i === 10 ? '心肌酶谱' : i === 11 ? '感染八项' : i === 12 ? '肿瘤标志物' : '甲状腺功能',
      dosage: null, frequency: null, startTime: '2026-10-22T06:00:00Z', endTime: null,
      orderedBy: 'DOC-LAB-001', orderedAt: iso(60 * (24 * (20 - i))),
      status,
      reviewedBy: status === 'draft' ? null : 'PHARM-LAB-001',
      reviewedAt: status === 'draft' ? null : iso(60 * (24 * (20 - i) - 1)),
      reviewResult: status === 'draft' ? null : status === 'cancelled' ? 'reject' : 'approve',
      reviewComment: status === 'cancelled' ? '样本不合格' : null,
      executedBy: status === 'executed' ? 'LAB-TECH-001' : null,
      executedAt: status === 'executed' ? iso(60 * (24 * (20 - i) - 2)) : null,
      executionResult: status === 'executed' ? '已出报告' : null,
    });
  }

  // 4 imaging
  const imagingStatus: OrdStatus[] = ['draft', 'reviewed', 'executed', 'cancelled'];
  const imagingContents = ['胸部 CT', '腹部 B 超', '头颅 MRI', '心电图'];
  for (let i = 0; i < 4; i++) {
    addOrd({
      patientId: `P-O${String(14 + i).padStart(3, '0')}`,
      visitId: `V-${String(14 + i).padStart(3, '0')}`,
      orderType: 'imaging',
      content: imagingContents[i],
      dosage: null, frequency: null, startTime: '2026-10-22T10:00:00Z', endTime: null,
      orderedBy: 'DOC-IMG-001', orderedAt: iso(60 * (24 * (4 - i))),
      status: imagingStatus[i],
      reviewedBy: imagingStatus[i] === 'draft' ? null : 'PHARM-IMG-001',
      reviewedAt: imagingStatus[i] === 'draft' ? null : iso(60 * (24 * (4 - i) - 1)),
      reviewResult: imagingStatus[i] === 'draft' ? null : imagingStatus[i] === 'cancelled' ? 'reject' : 'approve',
      reviewComment: imagingStatus[i] === 'cancelled' ? '检查部位冲突' : null,
      executedBy: imagingStatus[i] === 'executed' ? 'IMG-TECH-001' : null,
      executedAt: imagingStatus[i] === 'executed' ? iso(60 * (24 * (4 - i) - 2)) : null,
      executionResult: imagingStatus[i] === 'executed' ? '已出片' : null,
    });
  }

  // 3 nursing
  addOrd({ patientId: 'P-O018', visitId: 'V-018', orderType: 'nursing', content: '每 4 小时测生命体征', dosage: null, frequency: 'q4h', startTime: '2026-10-22T00:00:00Z', endTime: '2026-10-25T00:00:00Z', orderedBy: 'DOC-NUR-001', orderedAt: iso(60 * 24 * 1), status: 'draft', reviewedBy: null, reviewedAt: null, reviewResult: null, reviewComment: null, executedBy: null, executedAt: null, executionResult: null });
  addOrd({ patientId: 'P-O019', visitId: 'V-019', orderType: 'nursing', content: '口腔护理每日两次', dosage: null, frequency: 'bid', startTime: '2026-10-22T00:00:00Z', endTime: '2026-10-26T00:00:00Z', orderedBy: 'DOC-NUR-001', orderedAt: iso(60 * 24 * 1), status: 'reviewed', reviewedBy: 'NS-001', reviewedAt: iso(60 * 12), reviewResult: 'approve', reviewComment: null, executedBy: null, executedAt: null, executionResult: null });
  addOrd({ patientId: 'P-O020', visitId: 'V-020', orderType: 'nursing', content: '压疮预防气垫床', dosage: null, frequency: null, startTime: '2026-10-22T00:00:00Z', endTime: null, orderedBy: 'DOC-NUR-001', orderedAt: iso(60 * 18), status: 'executed', reviewedBy: 'NS-001', reviewedAt: iso(60 * 16), reviewResult: 'approve', reviewComment: null, executedBy: 'NURSE-009', executedAt: iso(60 * 8), executionResult: '气垫床已铺' });
}
seedOrd();

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

// ============================== POST /api/v1/orders/:id/review ==============================

async function handleOrdReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = ordStore.get(id);
  if (!rec) return notFound('Order', id);

  if (rec.status !== 'draft') {
    return json({ code: 409, message: 'already_reviewed' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const reviewedBy = body.reviewedBy;
  const reviewResult = body.reviewResult;
  const reviewComment = body.reviewComment;

  if (
    typeof reviewedBy !== 'string' || !reviewedBy.trim() ||
    typeof reviewResult !== 'string' || !['approve', 'reject'].includes(reviewResult)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.reviewedBy = reviewedBy.trim();
  rec.reviewedAt = new Date().toISOString();
  rec.reviewResult = reviewResult as ReviewResult;
  rec.reviewComment = typeof reviewComment === 'string' ? reviewComment.trim() : null;
  // approve → reviewed；reject → 直接 cancelled
  rec.status = reviewResult === 'approve' ? 'reviewed' : 'cancelled';
  return json(ok(rec), 200);
}

export const m570Routes: RouteDef[] = [
  // GET /api/v1/orders、POST /api/v1/orders、POST /:id/cancel、POST /:id/execute、GET /:id/executions
  // 已由既有 order.ts（DB 后端 + 权限）注册，本文件不重复注册，仅补 review 审核端点
  { method: 'POST', path: '/api/v1/orders/:id/review', handle: handleOrdReview, auth: true },
];
