/**
 * 健澜AI原生医院操作系统OS - P0-4 药房发药交易聚合器
 *
 * 摆药批次（preparing -> prepared -> dispensing） / 双人核对发药 / 退药申请与审批。
 * DEMO_MODE 下纯内存台账，不连 PostgreSQL；生产落地时以 repo 调用替换本文件内
 * Map 读写点（已在每个写方法注释标 TODO-prod）。
 *
 * 状态机：
 * - 摆药批次 preparing -> prepared -> dispensing（完成摆药后逐单发药推进）
 * - 医嘱发药状态 approved -> dispensed；退药审批通过后联动回 approved（可再次发药）
 * - 发药单 dispensed -> return_requested -> returned（终态）；驳回回 dispensed
 * 非法状态跃迁一律 409；金额一律整数分（*Cents 字段，Number.isInteger 校验）。
 *
 * 注意：本台账为 P0-4 切片独立内存台账，医嘱状态标记仅在本文件 Map 内生效，
 * 不修改 order.ts / orderAggregator.ts 任何既有行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class PharmacyDispenseTradeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const HOUR_MS = 3_600_000;

export type PrepackPeriod = 'morning' | 'noon' | 'evening' | 'night';
export const PREPACK_PERIODS: readonly PrepackPeriod[] = ['morning', 'noon', 'evening', 'night'];

export type PrepackStatus = 'preparing' | 'prepared' | 'dispensing';

/** 本片独立医嘱台账记录（脱敏：张某某/李某某/王某某） */
export interface PharmacyDrugOrder {
  orderId: string;
  patientId: string;
  patientName: string;
  drugName: string;
  specification: string;
  quantity: number;          // 配发数量（整数）
  unitFeeCents: number;      // 单价（整数分）
  feeCents: number;           // 本行合计 = unitFeeCents * quantity（整数分）
  status: 'approved' | 'dispensed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface PrepackItem {
  orderId: string;
  patientId: string;
  patientName: string;
  drugName: string;
  quantity: number;
  feeCents: number;
  prepackedAt?: number;
}

export interface PrepackBatch {
  batchNo: string;
  deptCode: string;
  period: PrepackPeriod;
  status: PrepackStatus;
  items: PrepackItem[];
  createdAt: number;
  preparedAt?: number;
}

export type DispenseStatus = 'dispensed' | 'return_requested' | 'returned';

export interface DispenseRecord {
  dispenseNo: string;
  orderId: string;
  batchNo: string;
  dispenserId: string;
  checkerId: string;
  quantity: number;
  feeCents: number;           // 整数分
  dispensedAt: number;
  status: DispenseStatus;
  /** 退药留痕 */
  returnReason?: string;
  returnQuantity?: number;
  returnRequestedAt?: number;
  returnApproverId?: string;
  returnApproveNote?: string;
  returnApprovedAt?: number;
  refundCents?: number;      // 整数分
}

// 内存台账（TODO-prod: 替换为 repositories/pharmacyDispenseTradeRepo 调 PostgreSQL）
const drugOrders = new Map<string, PharmacyDrugOrder>();
const prepackBatches = new Map<string, PrepackBatch>();
const dispenses = new Map<string, DispenseRecord>();

let batchSeq = 0;
let dispenseSeq = 0;

/** 预置 5 条脱敏演示医嘱：覆盖 approved / dispensed / cancelled 三种状态。 */
function seedDemoOrders(): void {
  const t = 1_700_000_000_000;
  const mk = (
    orderId: string,
    patientId: string,
    patientName: string,
    drugName: string,
    specification: string,
    quantity: number,
    unitFeeCents: number,
    status: PharmacyDrugOrder['status'],
  ): PharmacyDrugOrder => ({
    orderId,
    patientId,
    patientName,
    drugName,
    specification,
    quantity,
    unitFeeCents,
    feeCents: unitFeeCents * quantity,
    status,
    createdAt: t,
    updatedAt: t,
  });
  const seeds: PharmacyDrugOrder[] = [
    mk('ORD-2001', 'PT-P001', '张某某', '阿莫西林胶囊', '0.25g*24粒/盒', 2, 225, 'approved'),
    mk('ORD-2002', 'PT-P002', '李某某', '苯磺酸氨氯地平片', '5mg*14片/盒', 1, 320, 'approved'),
    mk('ORD-2003', 'PT-P003', '王某某', '布洛芬缓释胶囊', '0.3g*20粒/盒', 1, 280, 'dispensed'),
    mk('ORD-2004', 'PT-P001', '张某某', '维生素C片', '100mg*100片/瓶', 1, 100, 'cancelled'),
    mk('ORD-2005', 'PT-P002', '李某某', '阿托伐他汀钙片', '20mg*7片/板', 1, 560, 'approved'),
  ];
  for (const o of seeds) drugOrders.set(o.orderId, o);

  // 与 ORD-2003 配套的历史发药单（已发药终态，用于重复发药 409 取证）。
  dispenses.set('DISP-0001', {
    dispenseNo: 'DISP-0001',
    orderId: 'ORD-2003',
    batchNo: 'PB-WARD1-morning-1',
    dispenserId: 'PHY-P101',
    checkerId: 'PHY-P202',
    quantity: 1,
    feeCents: 280,
    dispensedAt: t + 120_000,
    status: 'dispensed',
  });
}

/**
 * 创建摆药批次。
 * - period 非法 -> 400；orderIds 为空 -> 400 摆药医嘱不能为空
 * - 同一 deptCode+period 已存在未关闭批次（preparing/prepared/dispensing 均视为未关闭）
 *   -> 409 该病区该时段已有未关闭批次
 * - 医嘱须存在，否则 404
 * TODO-prod: 权限码 pharmacy:prepack:create 由路由层 role_permissions 种子接入。
 */
export function createPrepackBatch(input: {
  deptCode: string;
  period: string;
  orderIds: string[];
  now?: number;
}): PrepackBatch {
  const now = input.now ?? Date.now();
  if (!input.deptCode) throw new PharmacyDispenseTradeError(400, 'deptCode 必填');
  if (!PREPACK_PERIODS.includes(input.period as PrepackPeriod)) {
    throw new PharmacyDispenseTradeError(400, 'period 必须为 morning/noon/evening/night 之一');
  }
  const period = input.period as PrepackPeriod;
  if (!Array.isArray(input.orderIds) || input.orderIds.length === 0) {
    throw new PharmacyDispenseTradeError(400, '摆药医嘱不能为空');
  }

  for (const b of prepackBatches.values()) {
    if (b.deptCode === input.deptCode && b.period === period) {
      throw new PharmacyDispenseTradeError(409, '该病区该时段已有未关闭批次');
    }
  }

  const items: PrepackItem[] = [];
  for (const orderId of input.orderIds) {
    const rec = drugOrders.get(orderId);
    if (!rec) throw new PharmacyDispenseTradeError(404, `医嘱不存在: ${orderId}`);
    if (!Number.isInteger(rec.feeCents)) {
      throw new PharmacyDispenseTradeError(500, '费用字段非整数分');
    }
    items.push({
      orderId: rec.orderId,
      patientId: rec.patientId,
      patientName: rec.patientName,
      drugName: rec.drugName,
      quantity: rec.quantity,
      feeCents: rec.feeCents,
    });
  }

  const batchNo = `PB-${input.deptCode}-${period}-${++batchSeq}`;
  const batch: PrepackBatch = {
    batchNo,
    deptCode: input.deptCode,
    period,
    status: 'preparing',
    items,
    createdAt: now,
  };
  prepackBatches.set(batchNo, batch);
  return batch;
}

/**
 * 摆药完成：仅 preparing 可完成，否则 409；-> prepared，记录每条目 prepackedAt。
 */
export function completePrepacking(input: { batchNo: string; now?: number }): PrepackBatch {
  const now = input.now ?? Date.now();
  if (!input.batchNo) throw new PharmacyDispenseTradeError(400, 'batchNo 必填');
  const batch = prepackBatches.get(input.batchNo);
  if (!batch) throw new PharmacyDispenseTradeError(404, '摆药批次不存在');
  if (batch.status !== 'preparing') {
    throw new PharmacyDispenseTradeError(409, '批次状态不允许完成摆药');
  }
  batch.status = 'prepared';
  batch.preparedAt = now;
  for (const it of batch.items) it.prepackedAt = now;
  return batch;
}

/**
 * 发药确认（双人核对）。
 * - 批次须存在且 status 为 prepared 或 dispensing，否则 409 批次未完成摆药
 * - dispenserId 与 checkerId 必须不同，相同 -> 409 发药需双人核对，签名人不得同一人
 * - 医嘱须 status==='approved'（待发药），否则 409 医嘱状态不允许发药
 * - 同一 orderId 已有 dispensed 发药单 -> 409 医嘱已发药
 * - 成功后医嘱标记 dispensed（仅本片台账），批次推进为 dispensing
 * TODO-prod: 权限码 pharmacy:dispense:confirm 由路由层接入。
 */
export function confirmDispense(input: {
  orderId: string;
  batchNo: string;
  dispenserId: string;
  checkerId: string;
  signedAt?: number;
  now?: number;
}): DispenseRecord {
  const now = input.now ?? Date.now();
  if (!input.orderId) throw new PharmacyDispenseTradeError(400, 'orderId 必填');
  if (!input.batchNo) throw new PharmacyDispenseTradeError(400, 'batchNo 必填');
  if (!input.dispenserId) throw new PharmacyDispenseTradeError(400, 'dispenserId 必填');
  if (!input.checkerId) throw new PharmacyDispenseTradeError(400, 'checkerId 必填');
  if (input.dispenserId === input.checkerId) {
    throw new PharmacyDispenseTradeError(409, '发药需双人核对，签名人不得同一人');
  }

  const batch = prepackBatches.get(input.batchNo);
  if (!batch) throw new PharmacyDispenseTradeError(404, '摆药批次不存在');
  if (batch.status !== 'prepared' && batch.status !== 'dispensing') {
    throw new PharmacyDispenseTradeError(409, '批次未完成摆药');
  }

  const order = drugOrders.get(input.orderId);
  if (!order) throw new PharmacyDispenseTradeError(404, '医嘱不存在');

  for (const d of dispenses.values()) {
    if (d.orderId === input.orderId && d.status === 'dispensed') {
      throw new PharmacyDispenseTradeError(409, '医嘱已发药');
    }
  }

  if (order.status !== 'approved') {
    throw new PharmacyDispenseTradeError(409, '医嘱状态不允许发药');
  }

  if (!Number.isInteger(order.feeCents)) {
    throw new PharmacyDispenseTradeError(500, '费用字段非整数分');
  }

  const dispensedAt = input.signedAt ?? now;
  const dispenseNo = `DISP-${String(++dispenseSeq).padStart(4, '0')}`;
  const rec: DispenseRecord = {
    dispenseNo,
    orderId: input.orderId,
    batchNo: input.batchNo,
    dispenserId: input.dispenserId,
    checkerId: input.checkerId,
    quantity: order.quantity,
    feeCents: order.feeCents,
    dispensedAt,
    status: 'dispensed',
  };
  dispenses.set(dispenseNo, rec);

  order.status = 'dispensed';
  order.updatedAt = now;
  if (batch.status === 'prepared') batch.status = 'dispensing';
  return rec;
}

/**
 * 退药申请。
 * - reason 必填 -> 400；quantity 必须正整数且 <= 原发药数量 -> 400
 * - 仅 dispensed 状态可申请，否则 409；-> return_requested
 */
export function requestReturn(input: {
  dispenseNo: string;
  reason: string;
  quantity: number;
  now?: number;
}): DispenseRecord {
  const now = input.now ?? Date.now();
  if (!input.dispenseNo) throw new PharmacyDispenseTradeError(400, 'dispenseNo 必填');
  if (!input.reason) throw new PharmacyDispenseTradeError(400, '退药原因必填');
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new PharmacyDispenseTradeError(400, '退药数量必须为正整数');
  }

  const rec = dispenses.get(input.dispenseNo);
  if (!rec) throw new PharmacyDispenseTradeError(404, '发药单不存在');
  if (input.quantity > rec.quantity) {
    throw new PharmacyDispenseTradeError(400, '退药数量不得超过原发药数量');
  }
  if (rec.status !== 'dispensed') {
    throw new PharmacyDispenseTradeError(409, '发药单状态不允许申请退药');
  }

  rec.status = 'return_requested';
  rec.returnReason = input.reason;
  rec.returnQuantity = input.quantity;
  rec.returnRequestedAt = now;
  return rec;
}

/**
 * 退药审批。
 * - 仅 return_requested 可审批，否则 409
 * - approved -> returned，refundCents = 单价 * 退药数量（整数分，Number.isInteger 校验），
 *   并联动把本片台账里该医嘱标记回 approved（可再次发药）
 * - 驳回 -> 回 dispensed + note 留痕
 */
export function approveReturn(input: {
  dispenseNo: string;
  approved: boolean;
  approverId: string;
  note?: string;
  now?: number;
}): DispenseRecord {
  const now = input.now ?? Date.now();
  if (!input.dispenseNo) throw new PharmacyDispenseTradeError(400, 'dispenseNo 必填');
  if (!input.approverId) throw new PharmacyDispenseTradeError(400, 'approverId 必填');

  const rec = dispenses.get(input.dispenseNo);
  if (!rec) throw new PharmacyDispenseTradeError(404, '发药单不存在');
  if (rec.status !== 'return_requested') {
    throw new PharmacyDispenseTradeError(409, '发药单状态不允许审批退药');
  }

  rec.returnApproverId = input.approverId;
  rec.returnApproveNote = input.note;
  rec.returnApprovedAt = now;

  if (input.approved) {
    const order = drugOrders.get(rec.orderId);
    if (!order) throw new PharmacyDispenseTradeError(404, '退药联动医嘱不存在');
    const refund = order.unitFeeCents * (rec.returnQuantity ?? 0);
    if (!Number.isInteger(refund)) {
      throw new PharmacyDispenseTradeError(500, '退款金额非整数分');
    }
    rec.status = 'returned';
    rec.refundCents = refund;
    order.status = 'approved';
    order.updatedAt = now;
  } else {
    rec.status = 'dispensed';
  }
  return rec;
}

/** 摆药批次列表 */
export function listPrepackBatches(): PrepackBatch[] {
  return Array.from(prepackBatches.values());
}

/** 发药记录列表 */
export function listDispenses(): DispenseRecord[] {
  return Array.from(dispenses.values());
}

/** 退药申请中（return_requested）列表 */
export function listReturnRequests(): DispenseRecord[] {
  return Array.from(dispenses.values()).filter((d) => d.status === 'return_requested');
}

/* ------------------------------------------------------------------ */
/* P0-4 深化：处方审核 → 发药链路（prescription）                        */
/* 状态机：pending_review → approved/rejected/stopped；approved → dispensed */
/* 权限复用 P0-2 assertCan（write=开方 / review=审核 / execute=发药）     */
/* ------------------------------------------------------------------ */

import {
  assertCan,
  assertVisitPatientBinding,
  OrderCpoeError,
  type CpoeActor,
} from './orderCpoeAggregator.js';

export type RxStatus = 'pending_review' | 'approved' | 'rejected' | 'stopped' | 'dispensed';

export interface Prescription {
  rxNo: string;
  visitId: string;
  patientId: string;
  patientName: string;
  drugName: string;
  specification: string;
  quantity: number;          // 正整数
  unitFeeCents: number;      // 单价（整数分）
  feeCents: number;          // 合计（整数分）
  status: RxStatus;
  prescribedBy: string;
  prescribedByName?: string;
  prescribedAt: number;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: number;
  reviewComment?: string;
  dispensedBy?: string;
  dispensedByName?: string;
  dispensedAt?: number;
}

const prescriptions = new Map<string, Prescription>();
let rxSeq = 0;

/**
 * 医生开处方：assertCan(write)（doctor/admin）；visitId-patient 行级绑定；
 * feeCents 整数分；status=pending_review。
 */
export function createPrescription(input: {
  visitId: string;
  patientId: string;
  patientName: string;
  drugName: string;
  specification: string;
  quantity: number;
  unitFeeCents: number;
  actor: CpoeActor;
  prescribedBy: string;
  prescribedByName?: string;
  now?: number;
}): Prescription {
  const now = input.now ?? Date.now();
  assertCan(input.actor, 'write');
  if (!input.visitId) throw new PharmacyDispenseTradeError(400, 'visitId 必填');
  if (!input.patientId) throw new PharmacyDispenseTradeError(400, 'patientId 必填');
  assertVisitPatientBinding(input.visitId, input.patientId);
  if (!input.drugName) throw new PharmacyDispenseTradeError(400, '药品名称必填');
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new PharmacyDispenseTradeError(400, '数量必须为正整数');
  }
  if (!Number.isInteger(input.unitFeeCents) || input.unitFeeCents < 0) {
    throw new PharmacyDispenseTradeError(400, '单价必须为非负整数分');
  }
  const feeCents = input.unitFeeCents * input.quantity;
  if (!Number.isInteger(feeCents)) {
    throw new PharmacyDispenseTradeError(500, '费用字段非整数分');
  }

  rxSeq += 1;
  const rx: Prescription = {
    rxNo: `RX-${String(rxSeq).padStart(4, '0')}`,
    visitId: input.visitId,
    patientId: input.patientId,
    patientName: input.patientName,
    drugName: input.drugName,
    specification: input.specification,
    quantity: input.quantity,
    unitFeeCents: input.unitFeeCents,
    feeCents,
    status: 'pending_review',
    prescribedBy: input.prescribedBy,
    prescribedByName: input.prescribedByName,
    prescribedAt: now,
  };
  prescriptions.set(rx.rxNo, rx);
  return rx;
}

/**
 * 药师审核处方：assertCan(review)（pharmacist/admin）。
 * 仅 pending_review 可审；approve→approved，reject→rejected；重复审核 409。
 */
export function reviewPrescription(input: {
  rxNo: string;
  decision: 'approve' | 'reject';
  comment?: string;
  actor: CpoeActor;
  reviewerId: string;
  reviewerName?: string;
  now?: number;
}): Prescription {
  const now = input.now ?? Date.now();
  assertCan(input.actor, 'review');
  const rx = prescriptions.get(input.rxNo);
  if (!rx) throw new PharmacyDispenseTradeError(404, `处方不存在: ${input.rxNo}`);
  if (rx.status !== 'pending_review') {
    throw new PharmacyDispenseTradeError(409, `处方已审核（当前状态 ${rx.status}），不可重复审核`);
  }
  if (input.decision !== 'approve' && input.decision !== 'reject') {
    throw new PharmacyDispenseTradeError(400, 'decision 必须为 approve/reject');
  }
  rx.status = input.decision === 'approve' ? 'approved' : 'rejected';
  rx.reviewerId = input.reviewerId;
  rx.reviewerName = input.reviewerName;
  rx.reviewedAt = now;
  rx.reviewComment = input.comment;
  return rx;
}

/** 停止处方（doctor/admin，write）；已停止不得发药。 */
export function stopPrescription(input: {
  rxNo: string;
  actor: CpoeActor;
  now?: number;
}): Prescription {
  const now = input.now ?? Date.now();
  assertCan(input.actor, 'write');
  const rx = prescriptions.get(input.rxNo);
  if (!rx) throw new PharmacyDispenseTradeError(404, `处方不存在: ${input.rxNo}`);
  if (rx.status === 'dispensed') {
    throw new PharmacyDispenseTradeError(409, '已发药处方不得停止');
  }
  rx.status = 'stopped';
  rx.reviewedAt = now;
  return rx;
}

/**
 * 处方发药：assertCan(execute)（nurse/pharmacist/admin）。
 * 仅 approved 可发药——未审核/已拒绝/已停止一律 409；重复发药 409。
 */
export function dispensePrescription(input: {
  rxNo: string;
  actor: CpoeActor;
  dispenserId: string;
  dispenserName?: string;
  now?: number;
}): Prescription {
  const now = input.now ?? Date.now();
  assertCan(input.actor, 'execute');
  const rx = prescriptions.get(input.rxNo);
  if (!rx) throw new PharmacyDispenseTradeError(404, `处方不存在: ${input.rxNo}`);
  if (rx.status === 'dispensed') {
    throw new PharmacyDispenseTradeError(409, '处方已发药，不可重复发药');
  }
  if (rx.status === 'stopped') {
    throw new PharmacyDispenseTradeError(409, '已停止处方不得发药');
  }
  if (rx.status !== 'approved') {
    throw new PharmacyDispenseTradeError(409, `处方未审核通过（当前状态 ${rx.status}），不得发药`);
  }
  rx.status = 'dispensed';
  rx.dispensedBy = input.dispenserId;
  rx.dispensedByName = input.dispenserName;
  rx.dispensedAt = now;
  return rx;
}

/** 处方列表（可按 visitId 过滤）。 */
export function listPrescriptions(visitId?: string): Prescription[] {
  const all = Array.from(prescriptions.values());
  return visitId ? all.filter((r) => r.visitId === visitId) : all;
}

/** 单测隔离：清空台账并重播种子数据。 */
export function __resetStore(): void {
  drugOrders.clear();
  prepackBatches.clear();
  dispenses.clear();
  prescriptions.clear();
  batchSeq = 0;
  dispenseSeq = 0;
  rxSeq = 0;
  seedDemoOrders();
  seedPrescriptions();
}

/** 处方 seed：滚动时间基准，患者张某某/李某某/王某某。 */
function seedPrescriptions(): void {
  const now = Date.now();
  prescriptions.clear();
  rxSeq = 2;
  const mk = (
    rxNo: string,
    visitId: string,
    patientId: string,
    patientName: string,
    status: RxStatus,
    hrsAgo: number,
  ): Prescription => ({
    rxNo,
    visitId,
    patientId,
    patientName,
    drugName: status === 'approved' ? '盐酸左氧氟沙星片' : '葡萄糖注射液',
    specification: '0.5g*12片',
    quantity: 1,
    unitFeeCents: 450,
    feeCents: 450,
    status,
    prescribedBy: 'u_doc01',
    prescribedByName: '王医生',
    prescribedAt: now - hrsAgo * HOUR_MS,
    reviewerId: status === 'approved' || status === 'rejected' ? 'u_pharm01' : undefined,
    reviewerName: status === 'approved' || status === 'rejected' ? '药师丙' : undefined,
    reviewedAt: status === 'approved' || status === 'rejected' ? now - (hrsAgo - 0.5) * HOUR_MS : undefined,
  });
  prescriptions.set('RX-0001', mk('RX-0001', 'VISIT-A100', 'PT-P001', '张某某', 'approved', 3));
  prescriptions.set('RX-0002', mk('RX-0002', 'VISIT-B200', 'PT-P002', '李某某', 'pending_review', 1));
}

// 模块加载时即播种子（DEMO 演示数据）。
seedDemoOrders();
seedPrescriptions();
