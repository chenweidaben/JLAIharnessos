/**
 * 健澜AI原生医院操作系统OS - P0-2 医嘱 CPOE 交易聚合器
 *
 * 医嘱开立 → 护士/药师审核 → 执行确认 → 停止/撤销 的完整交易闭环。
 * DEMO_MODE 下纯内存台账，不连 PostgreSQL；生产落地时以 orderRepo 调用替换本文件内
 * Map 读写点（已在写方法注释标 TODO-prod）。本切片独立于 orderAggregator.ts，
 * 不修改其行为。
 *
 * 状态机（严格，非法跃迁一律 409「非法状态跃迁」）：
 * - pending_review --review approve--> approved
 * - pending_review --review reject-->   rejected（终态）
 * - pending_review --cancel-->          cancelled（终态，仅待审核可撤）
 * - approved      --execute-->          executed
 * - approved/executed --stop-->         stopped（终态）
 * 其余组合一律 409。
 *
 * 权限分级（职责分离）：开立=医生、审核=护士长/药师、执行=护士；越权 403 且响应体带 code。
 * 金额一律整数分（*Cents 字段，Number.isInteger 校验）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class OrderCpoeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type OrderStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'stopped'
  | 'cancelled';

export type ReviewDecision = 'approve' | 'reject';

export const ORDER_TYPES = ['medication', 'nursing', 'exam', 'lab', 'treatment', 'other'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

/** 住院医嘱（患者脱敏：张某某/李某某/王某某） */
export interface CpoeOrder {
  orderId: string;
  setId?: string;
  visitId: string;
  patientId: string;
  patientName: string;
  orderType: OrderType;
  content: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  feeCents: number; // 整数分
  status: OrderStatus;
  orderedBy: string;
  orderedByName: string;
  orderedAt: number;
  // 审核留痕
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: number;
  reviewComment?: string;
  // 执行留痕
  executedBy?: string;
  executedByName?: string;
  executedAt?: number;
  executeNote?: string;
  // 停止留痕
  stoppedBy?: string;
  stoppedAt?: number;
  stopReason?: string;
  // 撤销留痕
  cancelledBy?: string;
  cancelledAt?: number;
  cancelReason?: string;
}

/** 执行记录（GET /orders/:id/executions 的真实数据源） */
export interface OrderExecRecord {
  execId: string;
  orderId: string;
  executedBy: string;
  executedByName: string;
  note?: string;
  executedAt: number;
}

export interface OrderSetResult {
  setId: string;
  setName: string;
  visitId: string;
  orderIds: string[];
  totalFeeCents: number; // Σ feeCents（整数分）
}

export interface ExecutionSlipItem {
  orderId: string;
  patientName: string;
  content: string;
  feeCents: number; // 整数分
}

export interface ExecutionSlip {
  slipNo: string;
  orderIds: string[];
  items: ExecutionSlipItem[];
  totalFeeCents: number; // Σ feeCents（整数分）
  generatedBy: string;
  generatedAt: number;
  /** 同批重复生成命中幂等键时为 true（临床执行单允许重打，故取幂等返回而非 409） */
  reused?: boolean;
}

/** 操作者角色/权限视图（来自验签 JWT，而非 DEMO 兜底角色） */
export interface CpoeActor {
  roles: string[];
  permissions: string[];
}

// 内存台账（TODO-prod: 替换为 repositories/orderCpoeRepo 调 PostgreSQL）
const orders = new Map<string, CpoeOrder>();
const executions = new Map<string, OrderExecRecord[]>();
const slips = new Map<string, ExecutionSlip>();
/** 执行单幂等键（orderIds 升序拼接）→ slipNo */
const slipIdempotency = new Map<string, string>();
/** 就诊 → 患者登记（脱敏），用于开立医嘱时补患者姓名 */
const visitRegistry = new Map<string, { patientId: string; patientName: string }>();

let orderSeq = 0;
let setSeq = 0;
let slipSeq = 0;
let execSeq = 0;

const HOUR_MS = 3_600_000;

/* ------------------------------------------------------------------ */
/* 权限分级                                                             */
/* ------------------------------------------------------------------ */

/**
 * 医嘱三级权限判定（职责分离）：
 * - write（开立/撤销/成套）：roles 含 admin|doctor，或 permissions 含 inpatient_order:write
 * - review（审核）：roles 含 admin，或 permissions 含 inpatient_order:review|pharmacy:review，
 *   或 roles 含 pharmacist
 * - execute（执行确认）：roles 含 admin|nurse，或 permissions 含
 *   inpatient_order:administer|mobile_nursing:execute
 * 判定顺序：admin 兜底放行 → 权限码命中放行 → 角色命中放行 → 否则 403。
 */
export function assertCan(actor: CpoeActor, action: 'write' | 'review' | 'execute'): void {
  const roles = actor.roles ?? [];
  const perms = actor.permissions ?? [];
  if (action === 'write') {
    if (roles.includes('admin') || roles.includes('doctor') || perms.includes('inpatient_order:write')) {
      return;
    }
    throw new OrderCpoeError(403, '权限不足：医嘱开立需医生角色或 inpatient_order:write 权限');
  }
  if (action === 'review') {
    if (
      roles.includes('admin') ||
      roles.includes('pharmacist') ||
      perms.includes('inpatient_order:review') ||
      perms.includes('pharmacy:review')
    ) {
      return;
    }
    throw new OrderCpoeError(403, '权限不足：医嘱审核需护士长/药师角色或 inpatient_order:review 权限');
  }
  // execute（护士床旁执行 / 药师发药 / admin）
  if (
    roles.includes('admin') ||
    roles.includes('nurse') ||
    roles.includes('pharmacist') ||
    perms.includes('inpatient_order:administer') ||
    perms.includes('mobile_nursing:execute')
  ) {
    return;
  }
  throw new OrderCpoeError(403, '权限不足：医嘱执行需护士/药师角色或 inpatient_order:administer 权限');
}

/* ------------------------------------------------------------------ */
/* 行级归属（P0-7 RBAC 收口）                                          */
/* ------------------------------------------------------------------ */

/**
 * 行级归属校验：visitId ↔ patientId 绑定（P0-7）。
 *
 * 临床数据按"就诊—患者"二元绑定。若请求体显式携带 patientId，且该 visitId 已在
 * visitRegistry 登记，则必须与登记患者一致；不一致说明跨患者越权访问，抛 403。
 *  - 客户端未传 patientId：不阻断（向后兼容既有调用方，患者由 visitRegistry 服务端补全）。
 *  - visitId 未在台账登记：不阻断（生产接 visitRepo 后再补严，避免演示态新就诊被误拦）。
 */
export function assertVisitPatientBinding(visitId: string, patientId?: string): void {
  if (!patientId) return;
  const reg = visitRegistry.get(visitId);
  if (!reg) return;
  if (reg.patientId !== patientId) {
    throw new OrderCpoeError(
      403,
      `行级归属校验失败：就诊 ${visitId} 绑定患者 ${reg.patientId}，与传入 patientId=${patientId} 不一致`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* 内部校验                                                            */
/* ------------------------------------------------------------------ */

function assertFeeCents(feeCents: number): void {
  if (!Number.isInteger(feeCents) || feeCents < 0) {
    throw new OrderCpoeError(400, '金额必须为非负整数分');
  }
}

function assertOrderType(orderType: string): OrderType {
  if (!ORDER_TYPES.includes(orderType as OrderType)) {
    throw new OrderCpoeError(400, `orderType 必须为 ${ORDER_TYPES.join('/')} 之一`);
  }
  return orderType as OrderType;
}

function requireOrder(orderId: string): CpoeOrder {
  const o = orders.get(orderId);
  if (!o) throw new OrderCpoeError(404, `医嘱不存在: ${orderId}`);
  return o;
}

function resolvePatient(visitId: string): { patientId: string; patientName: string } {
  return visitRegistry.get(visitId) ?? { patientId: 'PT-ANON', patientName: '脱敏患者' };
}

/* ------------------------------------------------------------------ */
/* 开立（单条）                                                         */
/* ------------------------------------------------------------------ */

export interface CreateOrderInput {
  visitId: string;
  patientId?: string;
  orderType: string;
  content: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  feeCents: number;
  orderedBy: string;
  orderedByName?: string;
  now?: number;
}

/**
 * 单条开立医嘱。visitId/content 必填；feeCents 必须非负整数分。
 * 新建医嘱初始状态 pending_review。
 * P0-7：若请求显式携带 patientId，先做 visitId↔patientId 行级归属校验，越权 403。
 * TODO-prod: 权限码 inpatient_order:write 已由路由层 assertCan 校验；生产接 orderRepo.insert。
 */
export function createOrder(input: CreateOrderInput): CpoeOrder {
  const now = input.now ?? Date.now();
  if (!input.visitId) throw new OrderCpoeError(400, 'visitId 必填');
  if (!input.content) throw new OrderCpoeError(400, '医嘱内容必填');
  assertVisitPatientBinding(input.visitId, input.patientId);
  const orderType = assertOrderType(input.orderType);
  assertFeeCents(input.feeCents);

  orderSeq += 1;
  const pid = resolvePatient(input.visitId);
  const order: CpoeOrder = {
    orderId: `ORD-CO-${orderSeq}`,
    visitId: input.visitId,
    patientId: pid.patientId,
    patientName: pid.patientName,
    orderType,
    content: input.content,
    dosage: input.dosage,
    frequency: input.frequency,
    route: input.route,
    feeCents: input.feeCents,
    status: 'pending_review',
    orderedBy: input.orderedBy,
    orderedByName: input.orderedByName ?? input.orderedBy,
    orderedAt: now,
  };
  orders.set(order.orderId, order);
  return order;
}

/* ------------------------------------------------------------------ */
/* 护士/药师审核                                                        */
/* ------------------------------------------------------------------ */

export interface ReviewOrderInput {
  orderId: string;
  decision: string; // 'approve' | 'reject'
  comment?: string;
  reviewerId: string;
  reviewerName?: string;
  now?: number;
}

/**
 * 审核医嘱：仅 pending_review 可审；approve→approved，reject→rejected。
 * reject 时 comment 必填；已审核/非待审核单据一律 409（含重复审核）。
 */
export function reviewOrder(input: ReviewOrderInput): CpoeOrder {
  const now = input.now ?? Date.now();
  const decision = input.decision as ReviewDecision;
  if (decision !== 'approve' && decision !== 'reject') {
    throw new OrderCpoeError(400, 'decision 必须为 approve/reject 之一');
  }
  if (decision === 'reject' && !input.comment) {
    throw new OrderCpoeError(400, '驳回时审核意见必填');
  }
  const o = requireOrder(input.orderId);
  if (o.status !== 'pending_review') {
    // 已审核（approved/rejected）、已执行/停止/撤销 均不可再审 → 409
    throw new OrderCpoeError(409, `非法状态跃迁：当前状态 ${o.status} 不可审核`);
  }
  o.status = decision === 'approve' ? 'approved' : 'rejected';
  o.reviewerId = input.reviewerId;
  o.reviewerName = input.reviewerName ?? input.reviewerId;
  o.reviewedAt = now;
  o.reviewComment = input.comment;
  return o;
}

/* ------------------------------------------------------------------ */
/* 执行确认（护士）                                                     */
/* ------------------------------------------------------------------ */

export interface ExecuteOrderInput {
  orderId: string;
  executedBy: string;
  executedByName?: string;
  note?: string;
  now?: number;
}

/**
 * 执行确认：仅 approved 可执行 → executed；重复执行 409。
 * 同时追加一条执行记录（GET /orders/:id/executions 的真实数据源）。
 */
export function executeOrder(input: ExecuteOrderInput): CpoeOrder {
  const now = input.now ?? Date.now();
  const o = requireOrder(input.orderId);
  if (o.status !== 'approved') {
    throw new OrderCpoeError(409, `非法状态跃迁：当前状态 ${o.status} 不可执行`);
  }
  o.status = 'executed';
  o.executedBy = input.executedBy;
  o.executedByName = input.executedByName ?? input.executedBy;
  o.executedAt = now;
  o.executeNote = input.note;

  execSeq += 1;
  const rec: OrderExecRecord = {
    execId: `EXE-${execSeq}`,
    orderId: o.orderId,
    executedBy: input.executedBy,
    executedByName: input.executedByName ?? input.executedBy,
    note: input.note,
    executedAt: now,
  };
  const list = executions.get(o.orderId) ?? [];
  list.push(rec);
  executions.set(o.orderId, list);
  return o;
}

/* ------------------------------------------------------------------ */
/* 停止（医生对已开/已执行长期医嘱）                                     */
/* ------------------------------------------------------------------ */

export interface StopOrderInput {
  orderId: string;
  reason: string;
  stoppedBy: string;
  now?: number;
}

/** 停止：reason 必填；仅 approved/executed 可停；重复停止 409。 */
export function stopOrder(input: StopOrderInput): CpoeOrder {
  const now = input.now ?? Date.now();
  if (!input.reason) throw new OrderCpoeError(400, '停止原因必填');
  const o = requireOrder(input.orderId);
  if (o.status === 'stopped') {
    throw new OrderCpoeError(409, '医嘱已停止，不可重复停止');
  }
  if (o.status !== 'approved' && o.status !== 'executed') {
    throw new OrderCpoeError(409, `非法状态跃迁：当前状态 ${o.status} 不可停止`);
  }
  o.status = 'stopped';
  o.stoppedBy = input.stoppedBy;
  o.stoppedAt = now;
  o.stopReason = input.reason;
  return o;
}

/* ------------------------------------------------------------------ */
/* 撤销（仅待审核）                                                     */
/* ------------------------------------------------------------------ */

export interface CancelOrderInput {
  orderId: string;
  reason: string;
  cancelledBy: string;
  now?: number;
}

/** 撤销：reason 必填；仅 pending_review 可撤销，否则 409。 */
export function cancelOrder(input: CancelOrderInput): CpoeOrder {
  const now = input.now ?? Date.now();
  if (!input.reason) throw new OrderCpoeError(400, '撤销原因必填');
  const o = requireOrder(input.orderId);
  if (o.status !== 'pending_review') {
    throw new OrderCpoeError(409, '仅待审核医嘱可撤销');
  }
  o.status = 'cancelled';
  o.cancelledBy = input.cancelledBy;
  o.cancelledAt = now;
  o.cancelReason = input.reason;
  return o;
}

/* ------------------------------------------------------------------ */
/* 成套医嘱（原子开立）                                                 */
/* ------------------------------------------------------------------ */

export interface OrderSetItem {
  orderType: string;
  content: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  feeCents: number;
}

export interface CreateOrderSetInput {
  visitId: string;
  patientId?: string;
  setName: string;
  orders: OrderSetItem[];
  orderedBy: string;
  orderedByName?: string;
  now?: number;
}

/**
 * 成套医嘱批量开立——原子性是硬验收：
 * 先对【全部】条目做完整校验（必填 / feeCents 整数分 / orderType 合法），
 * 任一不合法立即 throw 400 且零落库（绝不逐条写入后再回滚）；
 * 全部校验通过后才一次性写入 Map。
 * totalFeeCents 为各条 feeCents 整数分累加。
 */
export function createOrderSet(input: CreateOrderSetInput): OrderSetResult {
  const now = input.now ?? Date.now();
  if (!input.visitId) throw new OrderCpoeError(400, 'visitId 必填');
  if (!Array.isArray(input.orders) || input.orders.length === 0) {
    throw new OrderCpoeError(400, '成套医嘱明细不能为空');
  }
  assertVisitPatientBinding(input.visitId, input.patientId);
  const pid = resolvePatient(input.visitId);

  // 第一遍：构造候选对象并逐条校验，任何一条不合法立即抛错（此时未写任何 Map）
  const candidates: CpoeOrder[] = [];
  let totalFeeCents = 0;
  for (let i = 0; i < input.orders.length; i += 1) {
    const it = input.orders[i];
    if (!it || !it.content) throw new OrderCpoeError(400, `成套医嘱第 ${i + 1} 条内容必填`);
    const orderType = assertOrderType(it.orderType);
    assertFeeCents(it.feeCents);
    orderSeq += 1;
    candidates.push({
      orderId: `ORD-CO-${orderSeq}`,
      setId: '', // 占位，下面统一填
      visitId: input.visitId,
      patientId: pid.patientId,
      patientName: pid.patientName,
      orderType,
      content: it.content,
      dosage: it.dosage,
      frequency: it.frequency,
      route: it.route,
      feeCents: it.feeCents,
      status: 'pending_review',
      orderedBy: input.orderedBy,
      orderedByName: input.orderedByName ?? input.orderedBy,
      orderedAt: now,
    });
    totalFeeCents += it.feeCents;
  }

  // 第二遍：全部校验通过，一次性落库
  setSeq += 1;
  const setId = `ORDSET-CO-${setSeq}`;
  for (const c of candidates) {
    c.setId = setId;
    orders.set(c.orderId, c);
  }
  return {
    setId,
    setName: input.setName,
    visitId: input.visitId,
    orderIds: candidates.map((c) => c.orderId),
    totalFeeCents,
  };
}

/* ------------------------------------------------------------------ */
/* 执行单生成（幂等）                                                   */
/* ------------------------------------------------------------------ */

export interface BuildSlipInput {
  orderIds: string[];
  generatedBy: string;
  now?: number;
}

/**
 * 生成执行单：orderIds 为空 400；任一医嘱不存在或状态非 executed → 409。
 *
 * 幂等取舍（明确记录）：临床执行单允许护士/护士长重打补打，因此对同一批医嘱
 * （orderIds 升序拼接为幂等键）的重复生成【不抛 409】，而是返回已存在的同一
 * slipNo 并附 reused:true；这是"允许重打"与"严格去重"之间的明确取舍——
 * 选择幂等返回，避免护士补打时被业务错误打断给药核对流程。
 */
export function buildExecutionSlip(input: BuildSlipInput): ExecutionSlip {
  const now = input.now ?? Date.now();
  if (!Array.isArray(input.orderIds) || input.orderIds.length === 0) {
    throw new OrderCpoeError(400, '执行单医嘱不能为空');
  }
  const key = [...input.orderIds].sort().join('|');

  // 幂等命中：直接返回原单（reused=true）
  const existingNo = slipIdempotency.get(key);
  if (existingNo) {
    const prev = slips.get(existingNo);
    if (prev) return { ...prev, reused: true };
  }

  const items: ExecutionSlipItem[] = [];
  let totalFeeCents = 0;
  for (const oid of input.orderIds) {
    const o = orders.get(oid);
    if (!o) throw new OrderCpoeError(409, `仅已执行医嘱可生成执行单：医嘱不存在 ${oid}`);
    if (o.status !== 'executed') {
      throw new OrderCpoeError(409, `仅已执行医嘱可生成执行单：${oid} 当前状态 ${o.status}`);
    }
    items.push({ orderId: o.orderId, patientName: o.patientName, content: o.content, feeCents: o.feeCents });
    totalFeeCents += o.feeCents;
  }

  slipSeq += 1;
  const slipNo = `SLIP-CO-${slipSeq}`;
  const slip: ExecutionSlip = {
    slipNo,
    orderIds: [...input.orderIds],
    items,
    totalFeeCents,
    generatedBy: input.generatedBy,
    generatedAt: now,
  };
  slips.set(slipNo, slip);
  slipIdempotency.set(key, slipNo);
  return slip;
}

/* ------------------------------------------------------------------ */
/* 查询                                                                 */
/* ------------------------------------------------------------------ */

/** 列出医嘱（可按 visitId 过滤） */
export function listOrders(filter: { visitId?: string } = {}): CpoeOrder[] {
  const all = Array.from(orders.values());
  if (filter.visitId) return all.filter((o) => o.visitId === filter.visitId);
  return all;
}

/** 列出某医嘱的执行记录（真实数据源：executeOrder 追加的留痕） */
export function listExecutions(orderId: string): OrderExecRecord[] {
  return executions.get(orderId) ?? [];
}

/** 列出全部执行单 */
export function listSlips(): ExecutionSlip[] {
  return Array.from(slips.values());
}

/* ------------------------------------------------------------------ */
/* DEMO seed（滚动时间基准）                                            */
/* ------------------------------------------------------------------ */

function seedDemo(): void {
  visitRegistry.set('VISIT-A100', { patientId: 'PT-P001', patientName: '张某某' });
  visitRegistry.set('VISIT-B200', { patientId: 'PT-P002', patientName: '李某某' });
  visitRegistry.set('VISIT-C300', { patientId: 'PT-P003', patientName: '王某某' });

  const now = Date.now();
  const seeds: CpoeOrder[] = [
    {
      orderId: 'ORD-CO-1',
      visitId: 'VISIT-A100',
      patientId: 'PT-P001',
      patientName: '张某某',
      orderType: 'medication',
      content: '0.9%氯化钠注射液 250ml 静滴 qd',
      dosage: '250ml',
      frequency: 'qd',
      route: '静滴',
      feeCents: 450,
      status: 'pending_review',
      orderedBy: 'u_doc01',
      orderedByName: '王医生',
      orderedAt: now - 2 * HOUR_MS,
    },
    {
      orderId: 'ORD-CO-2',
      visitId: 'VISIT-B200',
      patientId: 'PT-P002',
      patientName: '李某某',
      orderType: 'treatment',
      content: '雾化吸入治疗 bid',
      frequency: 'bid',
      route: '雾化',
      feeCents: 800,
      status: 'approved',
      orderedBy: 'u_doc02',
      orderedByName: '李医生',
      orderedAt: now - 6 * HOUR_MS,
      reviewerId: 'u_chief01',
      reviewerName: '护士长赵',
      reviewedAt: now - 5 * HOUR_MS,
      reviewComment: '同意执行',
    },
    {
      orderId: 'ORD-CO-3',
      visitId: 'VISIT-C300',
      patientId: 'PT-P003',
      patientName: '王某某',
      orderType: 'nursing',
      content: '心电监护持续监测 q2h 记录',
      frequency: 'q2h',
      feeCents: 1200,
      status: 'executed',
      orderedBy: 'u_doc03',
      orderedByName: '周医生',
      orderedAt: now - 24 * HOUR_MS,
      reviewerId: 'u_chief01',
      reviewerName: '护士长赵',
      reviewedAt: now - 23 * HOUR_MS,
      reviewComment: '同意',
      executedBy: 'u_nurse01',
      executedByName: '护士钱',
      executedAt: now - 20 * HOUR_MS,
      executeNote: '床旁核对完成',
    },
    {
      orderId: 'ORD-CO-4',
      visitId: 'VISIT-A100',
      patientId: 'PT-P001',
      patientName: '张某某',
      orderType: 'lab',
      content: '血常规+CRP 急查',
      feeCents: 3500,
      status: 'rejected',
      orderedBy: 'u_doc01',
      orderedByName: '王医生',
      orderedAt: now - 8 * HOUR_MS,
      reviewerId: 'u_pharm01',
      reviewerName: '药师孙',
      reviewedAt: now - 7 * HOUR_MS,
      reviewComment: '检验指征不足，请补充临床评估后重开',
    },
  ];
  for (const o of seeds) orders.set(o.orderId, o);

  // ORD-CO-3 已执行 → 同步落一条执行记录，使 GET /:id/executions 有真实数据
  executions.set('ORD-CO-3', [
    {
      execId: 'EXE-1',
      orderId: 'ORD-CO-3',
      executedBy: 'u_nurse01',
      executedByName: '护士钱',
      note: '床旁核对完成',
      executedAt: now - 20 * HOUR_MS,
    },
  ]);

  orderSeq = 4;
  setSeq = 0;
  slipSeq = 0;
  execSeq = 1;
}

/** 单测/重启隔离：清空台账并重播种子数据。 */
export function __resetStore(): void {
  orders.clear();
  executions.clear();
  slips.clear();
  slipIdempotency.clear();
  seedDemo();
}

// 模块加载时即播种子（DEMO 演示数据，时间字段相对当前滚动，禁硬编码远古时间戳）。
seedDemo();
