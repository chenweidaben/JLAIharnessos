/**
 * 健澜AI原生医院操作系统OS - P0-3 护士站交易聚合器
 *
 * 医嘱审核（通过/驳回 + 意见留痕） / PDA 床边扫码核对执行 / 执行单生成。
 * DEMO_MODE 下纯内存台账，不连 PostgreSQL；生产落地时以 repo 调用替换本文件内
 * 四个 Map 读写点（已在每个写方法注释标 TODO-prod）。
 *
 * 状态机：pending_review -> approved -> executed；pending_review -> rejected（终态）。
 * 非法状态跃迁一律 409；金额一律整数分（*Cents 字段，Number.isInteger 校验）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class NurseStationTradeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type OrderTradeStatus = 'pending_review' | 'approved' | 'rejected' | 'executed';

/** 演示医嘱台账记录（脱敏：张某某/李某某/王某某） */
export interface DemoOrderRecord {
  orderId: string;
  patientId: string;
  patientName: string;
  content: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  status: OrderTradeStatus;
  /** 审核留痕 */
  reviewerId?: string;
  reviewDecision?: 'approve' | 'reject';
  reviewComment?: string;
  reviewedAt?: number;
  /** 床边执行留痕 */
  executorId?: string;
  executedAt?: number;
  checks?: { patientMatched: boolean; orderMatched: boolean };
  /** 执行单 */
  slipNo?: string;
  slipGeneratedAt?: number;
  /** 费用（整数分） */
  feeCents?: number;
  createdAt: number;
  updatedAt: number;
}

/** 腕带/PDA 扫码核对三元组 */
export interface WristbandCheckInput {
  patientId: string;          // 医嘱台账里登记的在院患者 ID
  scannedPatientId: string;   // PDA 扫腕带得到的患者 ID
  scannedOrderId: string;     // PDA 扫输液袋/药签条码得到的医嘱 ID
}

// 内存台账（TODO-prod: 替换为 repositories/nurseStationTradeRepo 调 PostgreSQL）
const orders = new Map<string, DemoOrderRecord>();

let slipSeq = 0;

/** 预置 5 条脱敏演示医嘱：覆盖 pending_review / approved / rejected / executed 四种状态。 */
function seedDemoOrders(): void {
  const t = 1_700_000_000_000;
  const seeds: DemoOrderRecord[] = [
    {
      orderId: 'ORD-1001',
      patientId: 'PT-P001',
      patientName: '张某某',
      content: '0.9% 氯化钠注射液 250ml ivgtt qd',
      dosage: '250ml',
      frequency: 'qd',
      route: 'ivgtt',
      status: 'pending_review',
      feeCents: 1250,
      createdAt: t,
      updatedAt: t,
    },
    {
      orderId: 'ORD-1002',
      patientId: 'PT-P002',
      patientName: '李某某',
      content: '注射用头孢呋辛钠 1.5g ivgtt bid',
      dosage: '1.5g',
      frequency: 'bid',
      route: 'ivgtt',
      status: 'pending_review',
      feeCents: 8600,
      createdAt: t,
      updatedAt: t,
    },
    {
      orderId: 'ORD-1003',
      patientId: 'PT-P003',
      patientName: '王某某',
      content: '奥美拉唑肠溶胶囊 20mg po qd',
      dosage: '20mg',
      frequency: 'qd',
      route: 'po',
      status: 'approved',
      reviewerId: 'DOC-D001',
      reviewDecision: 'approve',
      reviewComment: '同意执行',
      reviewedAt: t + 60_000,
      feeCents: 340,
      createdAt: t,
      updatedAt: t + 60_000,
    },
    {
      orderId: 'ORD-1004',
      patientId: 'PT-P001',
      patientName: '张某某',
      content: '布洛芬缓释胶囊 0.3g po bid',
      dosage: '0.3g',
      frequency: 'bid',
      route: 'po',
      status: 'rejected',
      reviewerId: 'DOC-D002',
      reviewDecision: 'reject',
      reviewComment: '与在科 NSAID 医嘱重复，不予开立',
      reviewedAt: t + 120_000,
      feeCents: 280,
      createdAt: t,
      updatedAt: t + 120_000,
    },
    {
      orderId: 'ORD-1005',
      patientId: 'PT-P002',
      patientName: '李某某',
      content: '0.9% 氯化钠注射液 100ml ivgtt st',
      dosage: '100ml',
      frequency: 'st',
      route: 'ivgtt',
      status: 'executed',
      reviewerId: 'DOC-D001',
      reviewDecision: 'approve',
      reviewComment: '急查后同意',
      reviewedAt: t + 30_000,
      executorId: 'NUR-N001',
      executedAt: t + 90_000,
      checks: { patientMatched: true, orderMatched: true },
      feeCents: 950,
      createdAt: t,
      updatedAt: t + 90_000,
    },
  ];
  for (const o of seeds) orders.set(o.orderId, o);
}

/**
 * 医嘱审核。
 * - decision 非法 → 400；reject 时 comment 必填 → 400 驳回必须填写意见
 * - 医嘱须存在且 status==='pending_review'，否则 409 医嘱状态不允许审核
 * - approve → approved；reject → rejected + comment 留痕
 * TODO-prod: 权限码 inpatient_order:review 由路由层 role_permissions 种子接入。
 */
export function reviewOrder(input: {
  orderId: string;
  decision: 'approve' | 'reject';
  comment?: string;
  reviewerId: string;
  now?: number;
}): DemoOrderRecord {
  const now = input.now ?? Date.now();
  if (!input.orderId) throw new NurseStationTradeError(400, 'orderId 必填');
  if (input.decision !== 'approve' && input.decision !== 'reject') {
    throw new NurseStationTradeError(400, 'decision 必须为 approve 或 reject');
  }
  if (input.decision === 'reject' && !input.comment) {
    throw new NurseStationTradeError(400, '驳回必须填写意见');
  }
  if (!input.reviewerId) throw new NurseStationTradeError(400, 'reviewerId 必填');

  const rec = orders.get(input.orderId);
  if (!rec) throw new NurseStationTradeError(404, '医嘱不存在');
  if (rec.status !== 'pending_review') {
    throw new NurseStationTradeError(409, '医嘱状态不允许审核');
  }

  rec.status = input.decision === 'approve' ? 'approved' : 'rejected';
  rec.reviewerId = input.reviewerId;
  rec.reviewDecision = input.decision;
  rec.reviewComment = input.comment;
  rec.reviewedAt = now;
  rec.updatedAt = now;
  return rec;
}

/**
 * PDA 床边执行（三查七对语义）。
 * - 医嘱须 status==='approved'，否则 409 医嘱未审核不可执行
 * - 腕带核对：scannedPatientId !== patientId → 409 腕带与患者不匹配
 * - 扫码核对：scannedOrderId !== orderId → 409 扫码药品/医嘱不匹配
 * - 全部通过 → executed，记录 executedAt/executorId/checks
 * TODO-prod: 权限码 mobile_nursing:execute / inpatient_order:administer 由路由层接入。
 */
export function executeAtBedside(input: {
  orderId: string;
  wristband: WristbandCheckInput;
  executorId: string;
  now?: number;
}): DemoOrderRecord {
  const now = input.now ?? Date.now();
  if (!input.orderId) throw new NurseStationTradeError(400, 'orderId 必填');
  if (!input.executorId) throw new NurseStationTradeError(400, 'executorId 必填');
  if (!input.wristband) throw new NurseStationTradeError(400, 'wristband 扫码数据必填');

  const rec = orders.get(input.orderId);
  if (!rec) throw new NurseStationTradeError(404, '医嘱不存在');
  if (rec.status === 'executed') throw new NurseStationTradeError(409, '医嘱已执行');
  if (rec.status !== 'approved') throw new NurseStationTradeError(409, '医嘱未审核不可执行');

  const patientMatched = input.wristband.scannedPatientId === rec.patientId;
  const orderMatched = input.wristband.scannedOrderId === rec.orderId;
  if (!patientMatched) throw new NurseStationTradeError(409, '腕带与患者不匹配');
  if (!orderMatched) throw new NurseStationTradeError(409, '扫码药品/医嘱不匹配');

  rec.status = 'executed';
  rec.executorId = input.executorId;
  rec.executedAt = now;
  rec.checks = { patientMatched: true, orderMatched: true };
  rec.updatedAt = now;
  return rec;
}

export interface ExecutionSlipView {
  slipNo: string;
  orderId: string;
  patientId: string;
  patientName: string;
  content: string;
  executedAt: string;
  executorId: string;
  checks: { patientMatched: boolean; orderMatched: boolean };
  feeCents?: number;
  generatedAt: string;
}

/** 生成执行单：仅 executed 状态可生成，否则 409。 */
export function buildExecutionSlip(input: { orderId: string; now?: number }): ExecutionSlipView {
  const now = input.now ?? Date.now();
  if (!input.orderId) throw new NurseStationTradeError(400, 'orderId 必填');
  const rec = orders.get(input.orderId);
  if (!rec) throw new NurseStationTradeError(404, '医嘱不存在');
  if (rec.status !== 'executed') throw new NurseStationTradeError(409, '医嘱未执行不可生成执行单');
  if (!rec.executedAt || !rec.executorId || !rec.checks) {
    throw new NurseStationTradeError(409, '医嘱执行留痕不完整');
  }
  if (rec.feeCents !== undefined && !Number.isInteger(rec.feeCents)) {
    throw new NurseStationTradeError(500, '费用字段非整数分');
  }
  const slipNo = `SLIP-${++slipSeq}`;
  rec.slipNo = slipNo;
  rec.slipGeneratedAt = now;
  rec.updatedAt = now;
  return {
    slipNo,
    orderId: rec.orderId,
    patientId: rec.patientId,
    patientName: rec.patientName,
    content: rec.content,
    executedAt: new Date(rec.executedAt).toISOString(),
    executorId: rec.executorId,
    checks: rec.checks,
    feeCents: rec.feeCents,
    generatedAt: new Date(now).toISOString(),
  };
}

/** 待审核列表 */
export function listPendingReview(): DemoOrderRecord[] {
  return Array.from(orders.values()).filter((o) => o.status === 'pending_review');
}

/** 已审核待执行列表 */
export function listApproved(): DemoOrderRecord[] {
  return Array.from(orders.values()).filter((o) => o.status === 'approved');
}

/** 已执行列表 */
export function listExecuted(): DemoOrderRecord[] {
  return Array.from(orders.values()).filter((o) => o.status === 'executed');
}

/** 单测隔离：清空台账并重播种子数据。 */
export function __resetStore(): void {
  orders.clear();
  slipSeq = 0;
  seedDemoOrders();
}

// 模块加载时即播种子（DEMO 演示数据）。
seedDemoOrders();
