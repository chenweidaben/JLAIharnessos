/**
 * 健澜科技 jlmedaios - 收费结算聚合器（M3-B）
 *
 * 医院收入循环真实闭环：
 *  1) 计费 generateFeeItems：从挂号/诊查/检验/检查/治疗/药品生成费用明细（幂等）；
 *  2) 归集 createSettlement：选定待结算费用生成未付结算单；
 *  3) 收款 paySettlement：unpaid → paid，开具电子票据（Saga 正向编排）；
 *  4) 退费 refundFeeItem：对已结算明细做补偿（Saga 补偿，结算单/票据联动）；
 *  5) 作废 voidSettlement：未付结算单作废，释放费用。
 *
 * 严谨性：
 *  - 纯函数 matchChargeItem 把医嘱内容匹配到价表（含别名/关键词），可独立单测；
 *  - DataScope 数据范围、收费/退费权限码、统一错误信封；
 *  - 业务写与审计哈希链在同一事务提交；Saga 每步落 billing_saga_log。
 *
 * 临床写操作由收费员本人签名；AI 不参与收费金额决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, type DbExecutor } from '../../db/pool.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { runSaga, type SagaStep } from '../../saga/saga.js';
import {
  type ChargeCategory,
  type ChargeItem,
  type FeeItem,
  type FeeItemStatus,
  type PaymentMethod,
  type Refund,
  type Settlement,
  type SettlementStatus,
  listChargeCatalog,
  insertFeeItem,
  getFeeItemById,
  listFeeItemsByVisit,
  listOutstandingFeeItems,
  assignFeeItemsToSettlement,
  settleFeeItems,
  releaseFeeItemsBySettlement,
  markFeeItemRefunded,
  insertSettlement,
  getSettlementById,
  listSettlements,
  paySettlement,
  applyRefundToSettlement,
  voidSettlement,
  insertInvoice,
  getInvoiceBySettlement,
  applyRefundToInvoice,
  insertRefund,
  insertSagaLog,
  listSagaLog,
} from '../../db/repositories/billingRepo.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class BillingError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BillingError';
  }
}
const badRequest = (m: string) => new BillingError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new BillingError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new BillingError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new BillingError(409, 'CONFLICT', m);

/* ------------------------------ 数据范围 ------------------------------ */

function canAccess(auth: AuthView, department: string): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return department === auth.deptName;
  }
  return false;
}

/* ------------------------ 纯函数：价表匹配 --------------------------- */

/** 归一化：去空白与常见标点，便于关键词包含匹配。 */
export function normalizeText(s: string): string {
  return s.replace(/[\s，。、,.()（）:：;；!！?？\-—_/\\]/g, '').toLowerCase();
}

/**
 * 纯函数：把医嘱内容匹配到价表项。
 * 规则：同大类候选；完全相等优先；否则按"名称/别名被内容包含"取最长匹配。
 * 返回 null 表示无匹配（调用方走分类默认价或标记待核价）。
 */
export function matchChargeItem(
  content: string,
  category: ChargeCategory,
  catalog: ChargeItem[],
): ChargeItem | null {
  const target = normalizeText(content);
  if (!target) return null;
  let best: { item: ChargeItem; score: number } | null = null;
  for (const item of catalog) {
    if (item.category !== category) continue;
    const terms = [item.name, ...item.aliases].map(normalizeText).filter(Boolean);
    for (const term of terms) {
      if (term === target) {
        // 完全相等，直接最高优先级
        best = { item, score: term.length + 1000 };
      } else if (target.includes(term)) {
        const score = term.length;
        if (!best || score > best.score) best = { item, score };
      }
    }
  }
  return best ? best.item : null;
}

/** 医嘱 order_type → 收费大类（drug 走药品计价，不在此列）。 */
export function orderTypeToCategory(
  orderType: string,
): Extract<ChargeCategory, 'lab' | 'imaging' | 'treatment' | 'nursing' | 'other'> | null {
  if (orderType === 'lab') return 'lab';
  if (orderType === 'imaging') return 'imaging';
  if (orderType === 'treatment') return 'treatment';
  if (orderType === 'nursing') return 'nursing';
  if (orderType === 'other') return 'other';
  return null;
}

/** 分类默认价（无匹配时兜底，明确标记 price_source=default，不臆造具体项目价）。 */
const CATEGORY_DEFAULT: Record<string, { code: string; name: string }> = {
  lab: { code: 'OTH001', name: '其他化验' },
  imaging: { code: 'OTH002', name: '其他检查' },
  treatment: { code: 'OTH003', name: '其他治疗' },
};

/** 按就诊类型确定挂号/诊查价表 code。 */
function baseFeesForVisit(visitType: string): {
  registration: { sourceType: 'registration'; code: string };
  consultation: { sourceType: 'consultation'; code: string };
} {
  if (visitType === 'emergency') {
    return {
      registration: { sourceType: 'registration', code: 'REG003' },
      consultation: { sourceType: 'consultation', code: 'CON002' },
    };
  }
  if (visitType === 'inpatient') {
    return {
      registration: { sourceType: 'registration', code: 'REG004' },
      consultation: { sourceType: 'consultation', code: 'CON003' },
    };
  }
  return {
    registration: { sourceType: 'registration', code: 'REG001' },
    consultation: { sourceType: 'consultation', code: 'CON001' },
  };
}

/* ------------------------------ 计费 ------------------------------ */

/**
 * 计费：为就诊生成费用明细（幂等）。
 * 含挂号/诊查、非药品医嘱（检验/检查/治疗/护理）、药品处方；
 * 同一来源重复计费只生成一条。返回各项计数。
 */
export async function generateFeeItems(
  auth: AuthView,
  visitId: string,
): Promise<{
  created: number;
  skipped: number;
  registration: number;
  consultation: number;
  orders: number;
  drugs: number;
  defaultPriced: number;
}> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccess(auth, visit.department)) throw forbidden('不在您的数据范围内');

  const catalog = await listChargeCatalog();
  const catByCode = new Map(catalog.map((c) => [c.code, c]));

  const stats = {
    created: 0, skipped: 0, registration: 0, consultation: 0,
    orders: 0, drugs: 0, defaultPriced: 0,
  };

  return getDb().begin(async (tx: DbExecutor) => {
    // 1) 挂号 / 诊查
    const base = baseFeesForVisit(visit.visitType);
    for (const spec of [base.registration, base.consultation]) {
      const cat = catByCode.get(spec.code);
      if (!cat) continue;
      const { created } = await insertFeeItem(
        {
          patientId: visit.patientId, visitId: visit.id,
          category: cat.category, itemCode: cat.code, itemName: cat.name,
          quantity: 1, unitPrice: cat.price,
          sourceType: spec.sourceType, sourceId: visit.id,
          priceSource: 'catalog', department: visit.department,
        },
        tx,
      );
      if (created) {
        stats.created += 1;
        if (spec.sourceType === 'registration') stats.registration = 1;
        else stats.consultation = 1;
      } else stats.skipped += 1;
    }

    // 2) 非药品医嘱
    const orders = await tx`
      SELECT id, order_type, content, detail, status
      FROM clinical.orders
      WHERE visit_id = ${visitId} AND status <> 'cancelled'
    `;
    for (const o of orders as Record<string, unknown>[]) {
      const orderType = String(o.order_type);
      const category = orderTypeToCategory(orderType);
      if (!category) continue; // drug 由处方计价；其他跳过
      const content = String(o.content);
      const detail = (o.detail ?? {}) as Record<string, unknown>;
      const quantity = Number(detail.quantity ?? 1) || 1;

      const matched = matchChargeItem(content, category, catalog);
      if (matched) {
        const { created } = await insertFeeItem(
          {
            patientId: visit.patientId, visitId: visitId,
            category: matched.category, itemCode: matched.code, itemName: matched.name,
            quantity, unitPrice: matched.price,
            sourceType: category, sourceId: String(o.id),
            priceSource: 'catalog', department: visit.department,
          },
          tx,
        );
        if (created) { stats.created += 1; stats.orders += 1; }
        else stats.skipped += 1;
      } else {
        const fallback = CATEGORY_DEFAULT[category];
        if (!fallback) { stats.skipped += 1; continue; }
        const def = catByCode.get(fallback.code);
        if (!def) { stats.skipped += 1; continue; }
        const { created } = await insertFeeItem(
          {
            patientId: visit.patientId, visitId: visitId,
            category: def.category, itemCode: def.code,
            itemName: content, // 保留原始医嘱内容，便于后续核价
            quantity, unitPrice: def.price,
            sourceType: category, sourceId: String(o.id),
            priceSource: 'default', department: visit.department,
          },
          tx,
        );
        if (created) {
          stats.created += 1; stats.orders += 1; stats.defaultPriced += 1;
        } else stats.skipped += 1;
      }
    }

    // 3) 药品处方（按处方明细 × 药品目录价）
    const drugItems = await tx`
      SELECT pi.id AS item_id, pi.drug_code, pi.drug_name, pi.quantity,
             dc.price AS drug_price
      FROM clinical.prescription_items pi
      JOIN clinical.prescriptions p ON p.id = pi.prescription_id
      LEFT JOIN clinical.drug_catalog dc ON dc.drug_code = pi.drug_code
      WHERE p.visit_id = ${visitId} AND p.status <> 'cancelled'
    `;
    for (const d of drugItems as Record<string, unknown>[]) {
      if (d.drug_price == null) { stats.skipped += 1; continue; }
      const { created } = await insertFeeItem(
        {
          patientId: visit.patientId, visitId: visitId,
          category: 'drug', itemCode: String(d.drug_code ?? ''),
          itemName: String(d.drug_name),
          quantity: Number(d.quantity) || 1, unitPrice: String(d.drug_price),
          sourceType: 'drug', sourceId: String(d.item_id),
          priceSource: 'drug', department: visit.department,
        },
        tx,
      );
      if (created) { stats.created += 1; stats.drugs += 1; }
      else stats.skipped += 1;
    }

    if (stats.created > 0) {
      await recordChainAudit(
        {
          actorId: auth.id, actorName: auth.realName ?? auth.username,
          actorRole: auth.rawRoles.join(','), actorDept: visit.department,
          action: 'billing.generate', resourceType: 'fee_item',
          resourceId: visitId, patientRef: visit.patientId, result: 'success',
          riskLevel: 'low',
          detail: { created: stats.created, defaultPriced: stats.defaultPriced },
        },
        tx,
      );
    }
    return stats;
  });
}

/* ------------------------------ 待结算查询 ------------------------------ */

export interface OutstandingView {
  visit: {
    id: string; visitNo: string; visitType: string; department: string;
  };
  patient: { mrn: string; nameMasked: string } | null;
  items: FeeItem[];
  totalAmount: string;
}

export async function getOutstanding(
  auth: AuthView,
  visitId: string,
): Promise<OutstandingView> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccess(auth, visit.department)) throw forbidden('不在您的数据范围内');
  const patient = await getPatientById(visit.patientId);
  const items = await listOutstandingFeeItems(visitId);
  const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
  return {
    visit: {
      id: visit.id, visitNo: visit.visitNo, visitType: visit.visitType,
      department: visit.department,
    },
    patient: patient ? { mrn: patient.mrn, nameMasked: patient.nameMasked } : null,
    items,
    totalAmount: total.toFixed(2),
  };
}

/* ------------------------------ 归集（创建结算单） ------------------------------ */

export interface CreateSettlementBody {
  visitId: string;
  itemIds: string[];
  paymentMethod?: PaymentMethod;
}

export async function createSettlement(
  auth: AuthView,
  body: CreateSettlementBody,
): Promise<{ settlement: Settlement }> {
  if (!body.visitId) throw badRequest('visitId 必填');
  if (!Array.isArray(body.itemIds) || body.itemIds.length === 0) {
    throw badRequest('请至少选择一条待结算费用');
  }
  const visit = await getVisitById(body.visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccess(auth, visit.department)) throw forbidden('不在您的数据范围内');

  const paymentMethod = body.paymentMethod ?? 'cash';

  return getDb().begin(async (tx: DbExecutor) => {
    // 先占位创建结算单（total 0），再行锁归集并回算总额
    let settlement = await insertSettlement(
      {
        patientId: visit.patientId, visitId: visit.id,
        department: visit.department, paymentMethod, totalAmount: 0,
      },
      tx,
    );
    try {
      const assigned = await assignFeeItemsToSettlement(body.itemIds, settlement.id, tx);
      if (assigned !== body.itemIds.length) {
        throw conflict('部分费用已被归集或状态变更，请刷新后重试');
      }
    } catch (e) {
      if (e instanceof BillingError) throw e;
      throw conflict(e instanceof Error ? e.message : '费用归集失败');
    }
    const sumRows = await tx`
      SELECT COALESCE(sum(amount), 0) AS total
      FROM clinical.fee_items WHERE settlement_id = ${settlement.id} AND status = 'active'
    `;
    const total = String((sumRows[0] as Record<string, unknown>).total);
    await tx`
      UPDATE clinical.settlements SET total_amount = ${total}
      WHERE id = ${settlement.id}
    `;
    settlement = (await getSettlementById(settlement.id, tx))!;

    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','), actorDept: visit.department,
        action: 'billing.settle.create', resourceType: 'settlement',
        resourceId: settlement.id, patientRef: visit.patientId,
        result: 'success', riskLevel: 'medium',
        detail: { items: body.itemIds.length, total },
      },
      tx,
    );
    return { settlement };
  });
}

/* ------------------------------ 收款（Saga 正向） ------------------------------ */

interface PaySagaCtx {
  tx: DbExecutor;
  settlement: Settlement;
  invoiceId?: string;
}

export async function paySettlementFlow(
  auth: AuthView,
  settlementId: string,
): Promise<{ settlement: Settlement; invoice: unknown }> {
  const existing = await getSettlementById(settlementId);
  if (!existing) throw notFound('结算单不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('不在您的数据范围内');
  if (existing.status === 'paid') throw conflict('结算单已收款，请勿重复收款');
  if (existing.status !== 'unpaid') throw conflict('仅未付结算单可收款');

  const feeCount = await listFeeItemsByVisit(
    existing.visitId, ['active'],
  );
  const assignedActive = feeCount.filter((f) => f.settlementId === settlementId);
  if (assignedActive.length === 0) throw conflict('结算单下无可收款费用');

  return getDb().begin(async (tx: DbExecutor) => {
    const ctx: PaySagaCtx = { tx, settlement: existing };

    const steps: SagaStep<PaySagaCtx>[] = [
      {
        // 步骤1：费用 active → settled
        name: 'settle-items',
        action: async (c) => {
          await insertSagaLog(
            { sagaId: settlementId, visitId: existing.visitId, step: 'settle-items',
              direction: 'forward', status: 'started' },
            c.tx,
          );
          const n = await settleFeeItems(settlementId, c.tx);
          if (n !== assignedActive.length) {
            throw conflict('费用状态变更，收款中止');
          }
          await insertSagaLog(
            { sagaId: settlementId, visitId: existing.visitId, step: 'settle-items',
              direction: 'forward', status: 'succeeded', detail: { count: n } },
            c.tx,
          );
        },
        compensate: async (c) => {
          // 反向：settled → active（同事务内，外层回滚兜底）
          await c.tx`
            UPDATE clinical.fee_items SET status = 'active'
            WHERE settlement_id = ${settlementId} AND status = 'settled'
          `;
        },
      },
      {
        // 步骤2：结算单 unpaid → paid
        name: 'pay-settlement',
        action: async (c) => {
          const paid = await paySettlement(
            settlementId, c.settlement.version, auth.id, c.tx,
          );
          if (!paid) throw conflict('结算单版本或状态变更，收款中止（乐观锁冲突）');
          c.settlement = paid;
          await insertSagaLog(
            { sagaId: settlementId, visitId: existing.visitId, step: 'pay-settlement',
              direction: 'forward', status: 'succeeded', detail: { paidAmount: paid.paidAmount } },
            c.tx,
          );
        },
        compensate: async (c) => {
          await c.tx`
            UPDATE clinical.settlements
            SET status = 'unpaid', version = version - 1,
                paid_amount = 0, paid_by = NULL, paid_at = NULL
            WHERE id = ${settlementId}
          `;
        },
      },
      {
        // 步骤3：开具电子票据
        name: 'issue-invoice',
        action: async (c) => {
          const invoice = await insertInvoice(
            {
              settlementId, patientId: existing.patientId,
              visitId: existing.visitId, invoiceType: 'electronic',
              totalAmount: c.settlement.totalAmount, issuedBy: auth.id,
            },
            c.tx,
          );
          c.invoiceId = invoice.id;
          await insertSagaLog(
            { sagaId: settlementId, visitId: existing.visitId, step: 'issue-invoice',
              direction: 'forward', status: 'succeeded', detail: { invoiceNo: invoice.invoiceNo } },
            c.tx,
          );
        },
        compensate: async (c) => {
          if (c.invoiceId) {
            await c.tx`DELETE FROM clinical.invoices WHERE id = ${c.invoiceId}`;
          }
        },
      },
    ];

    await runSaga(steps, ctx);

    const settlement = (await getSettlementById(settlementId, tx))!;
    const invoice = await getInvoiceBySettlement(settlementId, tx);

    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','), actorDept: existing.department,
        action: 'billing.pay', resourceType: 'settlement',
        resourceId: settlementId, patientRef: existing.patientId,
        result: 'success', riskLevel: 'medium',
        detail: { paidAmount: settlement.paidAmount, invoiceNo: invoice?.invoiceNo },
      },
      tx,
    );
    return { settlement, invoice };
  });
}

/* ------------------------------ 退费（Saga 补偿） ------------------------------ */

export interface RefundBody {
  feeItemId: string;
  reason: string;
}

export async function refundFeeItem(
  auth: AuthView,
  body: RefundBody,
): Promise<{ refund: Refund; settlement: Settlement }> {
  if (!body.feeItemId) throw badRequest('feeItemId 必填');
  if (!(body.reason ?? '').trim()) throw badRequest('退费原因必填');

  const feeItem = await getFeeItemById(body.feeItemId);
  if (!feeItem) throw notFound('费用明细不存在');
  if (!canAccess(auth, feeItem.department)) throw forbidden('不在您的数据范围内');
  if (feeItem.status !== 'settled') {
    throw conflict('仅已结算费用可退费（该费用可能已退或未结算）');
  }
  const settlement = await getSettlementById(feeItem.settlementId!);
  if (!settlement) throw notFound('关联结算单不存在');
  const invoice = await getInvoiceBySettlement(settlement.id);

  return getDb().begin(async (tx: DbExecutor) => {
    // 补偿步骤1：费用 settled → refunded（条件式，并发/重复退费返回 null → 409）
    const refunded = await markFeeItemRefunded(body.feeItemId, tx);
    if (!refunded) throw conflict('该费用已退费或状态变更，请勿重复退费');

    await insertSagaLog(
      {
        sagaId: settlement.id, visitId: settlement.visitId,
        step: 'refund-item', direction: 'compensate', status: 'started',
        detail: { feeItemId: body.feeItemId, amount: refunded.amount },
      },
      tx,
    );

    // 补偿步骤2：结算单累计退费、重算状态
    const updatedSettlement = await applyRefundToSettlement(
      settlement.id, refunded.amount, tx,
    );
    // 补偿步骤3：票据累计退费
    if (invoice) {
      await applyRefundToInvoice(invoice.id, refunded.amount, tx);
    }

    // 退费记录
    const refund = await insertRefund(
      {
        settlementId: settlement.id, invoiceId: invoice?.id ?? null,
        patientId: feeItem.patientId, visitId: feeItem.visitId,
        feeItemId: body.feeItemId, amount: refunded.amount,
        reason: body.reason.trim(), refundedBy: auth.id,
      },
      tx,
    );

    await insertSagaLog(
      {
        sagaId: settlement.id, visitId: settlement.visitId,
        step: 'refund-item', direction: 'compensate', status: 'compensated',
        detail: { refundNo: refund.refundNo, newStatus: updatedSettlement.status },
      },
      tx,
    );

    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','), actorDept: feeItem.department,
        action: 'billing.refund', resourceType: 'refund',
        resourceId: refund.id, patientRef: feeItem.patientId,
        result: 'success', riskLevel: 'high',
        detail: { amount: refunded.amount, feeItemId: body.feeItemId },
      },
      tx,
    );
    return { refund, settlement: updatedSettlement };
  });
}

/* ------------------------------ 作废 ------------------------------ */

export async function voidSettlementFlow(
  auth: AuthView,
  settlementId: string,
): Promise<{ settlement: Settlement }> {
  const existing = await getSettlementById(settlementId);
  if (!existing) throw notFound('结算单不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('不在您的数据范围内');
  if (existing.status !== 'unpaid') throw conflict('仅未付结算单可作废');

  return getDb().begin(async (tx: DbExecutor) => {
    const voided = await voidSettlement(settlementId, existing.version, auth.id, tx);
    if (!voided) throw conflict('结算单版本或状态变更，作废中止（乐观锁冲突）');
    await releaseFeeItemsBySettlement(settlementId, tx);
    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','), actorDept: existing.department,
        action: 'billing.void', resourceType: 'settlement',
        resourceId: settlementId, patientRef: existing.patientId,
        result: 'success', riskLevel: 'medium',
        detail: { voidedAt: voided.voidedAt },
      },
      tx,
    );
    return { settlement: voided };
  });
}

/* ------------------------------ 详情 / 队列 ------------------------------ */

export interface SettlementDetailView {
  settlement: Settlement;
  items: FeeItem[];
  invoice: unknown;
  refunds: Refund[];
  sagaLog: Record<string, unknown>[];
}

export async function getSettlementDetail(
  auth: AuthView,
  settlementId: string,
): Promise<SettlementDetailView> {
  const settlement = await getSettlementById(settlementId);
  if (!settlement) throw notFound('结算单不存在');
  if (!canAccess(auth, settlement.department)) throw forbidden('不在您的数据范围内');

  const allItems = await listFeeItemsByVisit(settlement.visitId);
  const items = allItems.filter((i) => i.settlementId === settlementId);
  const invoice = await getInvoiceBySettlement(settlementId);
  const refundRows = await getDb()`
    SELECT * FROM clinical.refunds WHERE settlement_id = ${settlementId}
    ORDER BY created_at ASC
  `;
  const refunds = (refundRows as Record<string, unknown>[]).map((r) => {
    // 复用 Refund 结构映射（手动列名对齐）
    return {
      id: String(r.id), refundNo: String(r.refund_no),
      settlementId: String(r.settlement_id),
      invoiceId: r.invoice_id ? String(r.invoice_id) : null,
      patientId: String(r.patient_id), visitId: String(r.visit_id),
      feeItemId: String(r.fee_item_id), amount: String(r.amount),
      reason: String(r.reason),
      refundedBy: r.refunded_by ? String(r.refunded_by) : null,
      refundedAt: String(r.refunded_at), createdAt: String(r.created_at),
    } as Refund;
  });
  const sagaLog = await listSagaLog(settlementId);
  return { settlement, items, invoice, refunds, sagaLog };
}

const QUEUE_STATUSES: SettlementStatus[] = ['unpaid', 'paid', 'partially_refunded'];

export async function getSettlementQueue(auth: AuthView) {
  const rows = await listSettlements(QUEUE_STATUSES);
  const items = rows.filter((r) => canAccess(auth, r.department));
  return { items, total: items.length };
}

// 供路由/测试引用
export { getSettlementById };
export type { FeeItemStatus, SettlementStatus, Visit };
