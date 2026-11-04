/**
 * 健澜AI原生医院操作系统OS - P0-5 住院押金 / 出院结算聚合器
 *
 * 预交金缴纳 / 押金不足预警判定 / 出院结算（一日清单）。
 * DEMO_MODE 下纯内存台账，不连 PostgreSQL；生产落地时以 repo 调用替换本文件内
 * Map 读写点（已在每个写方法注释标 TODO-prod）。
 *
 * 状态机：
 * - 住院账户 in_hospital -> settling -> settled（终态）
 * - 预交金缴纳仅 in_hospital 可操作；出院结算后 settled 不可再缴 / 再结算
 * - 非法状态跃迁一律 409；金额一律整数分（*Cents 字段，Number.isInteger 校验）。
 *
 * 注意：本台账为 P0-5 切片独立内存台账，不修改 inpatientBillingMgmtV13.ts /
 * dischargeSettle.ts / billingCharge.ts 任何既有行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class InpatientDepositSettleError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type PayMethod = 'cash' | 'bank' | 'alipay' | 'wechat' | 'insurance';
export const PAY_METHODS: readonly PayMethod[] = ['cash', 'bank', 'alipay', 'wechat', 'insurance'];

export type AccountStatus = 'in_hospital' | 'settling' | 'settled';

/** 患者住院账户（脱敏：张某某/李某某/王某某） */
export interface InpatientAccount {
  visitId: string;
  patientId: string;
  patientName: string;
  deptCode: string;
  bedNo: string;
  admissionAt: number;
  depositCents: number;      // 已缴押金合计（整数分）
  consumedCents: number;     // 已消耗合计（整数分）
  status: AccountStatus;
}

export interface DepositRecord {
  depositNo: string;
  visitId: string;
  amountCents: number;       // 整数分
  payMethod: PayMethod;
  operatorId: string;
  receiptNo?: string;
  paidAt: number;
}

export interface BillItem {
  name: string;
  quantity: number;
  unitPriceCents: number;    // 整数分
  amountCents: number;       // = quantity * unitPriceCents（整数分）
}

export interface SettlementRecord {
  settleNo: string;
  visitId: string;
  type: 'discharge' | 'mid';   // P0-5 深化：discharge 出院结算 / mid 中途结算
  dailyBill: BillItem[];
  totalCents: number;        // Σ amountCents（整数分）
  depositCents: number;      // 结算时已缴押金
  consumedCents: number;     // 结算时已消耗
  shortfallCents: number;    // 需补缴（>=0，整数分）
  refundCents: number;       // 退押金（>=0，整数分）
  operatorId: string;
  operatorNote?: string;      // 中途结算备注
  settledAt: number;
}

export interface DailyStatement {
  statementNo: string;
  visitId: string;
  patientId: string;
  statementDate: string;     // yyyy-mm-dd
  items: Array<{ name: string; amountCents: number }>;
  totalCents: number;         // 累计费用（整数分）
  depositBalanceCents: number;
  pushedBy?: string;
  pushedAt: number;
}

export interface DepositWarning {
  visitId: string;
  balanceCents: number;      // = depositCents - consumedCents（整数分）
  thresholdCents: number;    // 整数分
  avgDailyCostCents: number; // 整数分（已消耗 / 住院天数）
  daysCovered: number;       // 余额可覆盖天数（1 位小数）
  level: 'ok' | 'warn' | 'critical';
  suggestion: string;
}

// 内存台账（TODO-prod: 替换为 repositories/inpatientDepositSettleRepo 调 PostgreSQL）
const accounts = new Map<string, InpatientAccount>();
const deposits = new Map<string, DepositRecord>();
const settlements = new Map<string, SettlementRecord>();

const depositSeqs = new Map<string, number>();
let settleSeq = 0;

const DAY_MS = 86_400_000;

/**
 * 预置 3 条脱敏住院账户：
 * - VISIT-A100 张某某：住院 3 天，余额充足 -> ok
 * - VISIT-B200 李某某：住院 5 天，余额低于阈值但可覆盖天数>=2 -> warn
 * - VISIT-C300 王某某：住院 12 天，余额已透支 -> critical
 *
 * admissionAt 采用滚动基准（模块加载/重置时刻 - N 天），禁止硬编码固定 T0，
 * 否则住院天数会随墙钟漂移（曾因 T0=2023-11-14 到 2026 年被算成住院 1000+ 天）。
 */
function seedDemoAccounts(): void {
  const now = Date.now();
  const seeds: InpatientAccount[] = [
    {
      visitId: 'VISIT-A100',
      patientId: 'PT-P001',
      patientName: '张某某',
      deptCode: 'WARD1',
      bedNo: '12床',
      admissionAt: now - 3 * DAY_MS,
      depositCents: 500_000,
      consumedCents: 50_000,
      status: 'in_hospital',
    },
    {
      visitId: 'VISIT-B200',
      patientId: 'PT-P002',
      patientName: '李某某',
      deptCode: 'WARD2',
      bedNo: '8床',
      admissionAt: now - 5 * DAY_MS,
      depositCents: 150_000,
      consumedCents: 80_000,
      status: 'in_hospital',
    },
    {
      visitId: 'VISIT-C300',
      patientId: 'PT-P003',
      patientName: '王某某',
      deptCode: 'WARD3',
      bedNo: '15床',
      admissionAt: now - 12 * DAY_MS,
      depositCents: 60_000,
      consumedCents: 120_000,
      status: 'in_hospital',
    },
  ];
  for (const a of seeds) accounts.set(a.visitId, a);
}

/** 住院天数：至少 1 天，向上取整。 */
function hospitalDays(admissionAt: number, now: number): number {
  const elapsed = now - admissionAt;
  const days = elapsed / DAY_MS;
  return Math.max(1, Math.ceil(days));
}

/**
 * 预交金缴纳。
 * - amountCents 必须正整数（Number.isInteger && > 0），否则 400 预交金必须为正整数分
 * - payMethod 非法 -> 400；visitId 不存在 -> 404
 * - 账户须 status==='in_hospital'，否则 409 当前住院状态不可缴纳预交金
 * TODO-prod: 权限码 billing:deposit:pay 由路由层 role_permissions 种子接入。
 */
export function payDeposit(input: {
  visitId: string;
  amountCents: number;
  payMethod: string;
  operatorId: string;
  receiptNo?: string;
  now?: number;
}): DepositRecord & { balanceCents: number; depositCents: number } {
  const now = input.now ?? Date.now();
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new InpatientDepositSettleError(400, '预交金必须为正整数分');
  }
  if (!PAY_METHODS.includes(input.payMethod as PayMethod)) {
    throw new InpatientDepositSettleError(400, '支付方式必须为 cash/bank/alipay/wechat/insurance 之一');
  }
  if (!input.visitId) throw new InpatientDepositSettleError(400, 'visitId 必填');
  if (!input.operatorId) throw new InpatientDepositSettleError(400, 'operatorId 必填');

  const acc = accounts.get(input.visitId);
  if (!acc) throw new InpatientDepositSettleError(404, `住院账户不存在: ${input.visitId}`);
  if (acc.status !== 'in_hospital') {
    throw new InpatientDepositSettleError(409, '当前住院状态不可缴纳预交金');
  }

  const seq = (depositSeqs.get(input.visitId) ?? 0) + 1;
  depositSeqs.set(input.visitId, seq);
  const depositNo = `DEP-${input.visitId}-${seq}`;

  acc.depositCents += input.amountCents;
  if (!Number.isInteger(acc.depositCents)) {
    throw new InpatientDepositSettleError(500, '押金累计非整数分');
  }

  const rec: DepositRecord = {
    depositNo,
    visitId: input.visitId,
    amountCents: input.amountCents,
    payMethod: input.payMethod as PayMethod,
    operatorId: input.operatorId,
    receiptNo: input.receiptNo,
    paidAt: now,
  };
  deposits.set(depositNo, rec);

  const balanceCents = acc.depositCents - acc.consumedCents;
  return {
    ...rec,
    balanceCents,
    depositCents: acc.depositCents,
  };
}

/**
 * 押金不足预警判定。
 * - 默认 thresholdCents = 100000（1000 元）
 * - avgDailyCostCents = consumedCents / 住院天数（天数至少 1 天，向上取整）
 * - daysCovered = balanceCents / avgDailyCostCents（保留 1 位小数）
 * - level:
 *   - balance <= 0 或 daysCovered < 1 -> critical
 *   - balance < threshold 或 daysCovered < 2 -> warn
 *   - 否则 -> ok
 */
export function assessDepositWarning(input: {
  visitId: string;
  thresholdCents?: number;
  now?: number;
}): DepositWarning {
  const now = input.now ?? Date.now();
  const thresholdCents =
    typeof input.thresholdCents === 'number' && Number.isInteger(input.thresholdCents) && input.thresholdCents > 0
      ? input.thresholdCents
      : 100_000;

  if (!input.visitId) throw new InpatientDepositSettleError(400, 'visitId 必填');
  const acc = accounts.get(input.visitId);
  if (!acc) throw new InpatientDepositSettleError(404, `住院账户不存在: ${input.visitId}`);

  const balanceCents = acc.depositCents - acc.consumedCents;
  const days = hospitalDays(acc.admissionAt, now);
  // avgDailyCostCents 向上取整保证整数分（避免浮点）
  const avgDailyCostCents = Math.ceil(acc.consumedCents / days);
  // daysCovered 保留 1 位小数（允许小数，但金额字段均为整数分）
  const daysCovered = avgDailyCostCents > 0
    ? Math.round((balanceCents / avgDailyCostCents) * 10) / 10
    : Number.POSITIVE_INFINITY;

  let level: DepositWarning['level'];
  let suggestion: string;
  if (balanceCents <= 0 || daysCovered < 1) {
    level = 'critical';
    suggestion = '押金已透支，需立即催缴预交金';
  } else if (balanceCents < thresholdCents || daysCovered < 2) {
    level = 'warn';
    suggestion = '押金余额偏低，建议提醒患者续缴';
  } else {
    level = 'ok';
    suggestion = '押金余额充足';
  }

  return {
    visitId: input.visitId,
    balanceCents,
    thresholdCents,
    avgDailyCostCents,
    daysCovered: Number.isFinite(daysCovered) ? daysCovered : -1,
    level,
    suggestion,
  };
}

/**
 * 出院结算。
 * - 账户须 status==='in_hospital'（首次结算置 settling，完成后置 settled）
 * - items 每条：quantity 正整数、unitPriceCents 非负整数，否则 400
 * - items 为空 -> 400 结算明细不能为空
 * - totalCents = Σ(quantity * unitPriceCents)，全部整数分累加，禁止浮点
 * - balanceCents = depositCents - consumedCents - totalCents
 *   - < 0 -> shortfallCents = -balanceCents（需补缴）
 *   - >= 0 -> refundCents = balanceCents（退押金）
 * - 已 settled 再次结算 -> 409 该住院已结算
 * TODO-prod: 权限码 billing:settle:discharge 由路由层接入。
 */
export function settleDischarge(input: {
  visitId: string;
  operatorId: string;
  items: Array<{ name: string; quantity: number; unitPriceCents: number }>;
  now?: number;
}): SettlementRecord {
  const now = input.now ?? Date.now();
  if (!input.visitId) throw new InpatientDepositSettleError(400, 'visitId 必填');
  if (!input.operatorId) throw new InpatientDepositSettleError(400, 'operatorId 必填');
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new InpatientDepositSettleError(400, '结算明细不能为空');
  }

  const acc = accounts.get(input.visitId);
  if (!acc) throw new InpatientDepositSettleError(404, `住院账户不存在: ${input.visitId}`);
  if (acc.status === 'settled') {
    throw new InpatientDepositSettleError(409, '该住院已结算');
  }
  if (acc.status !== 'in_hospital') {
    throw new InpatientDepositSettleError(409, '当前住院状态不可结算');
  }

  const dailyBill: BillItem[] = [];
  let totalCents = 0;
  for (const it of input.items) {
    if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
      throw new InpatientDepositSettleError(400, '结算数量必须为正整数');
    }
    if (!Number.isInteger(it.unitPriceCents) || it.unitPriceCents < 0) {
      throw new InpatientDepositSettleError(400, '单价必须为非负整数分');
    }
    if (!it.name) throw new InpatientDepositSettleError(400, '结算项目名称必填');
    const amountCents = it.quantity * it.unitPriceCents;
    if (!Number.isInteger(amountCents)) {
      throw new InpatientDepositSettleError(500, '费用行金额非整数分');
    }
    dailyBill.push({
      name: it.name,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents,
      amountCents,
    });
    totalCents += amountCents;
  }

  const balanceCents = acc.depositCents - acc.consumedCents - totalCents;
  let shortfallCents = 0;
  let refundCents = 0;
  if (balanceCents < 0) {
    shortfallCents = -balanceCents;
  } else {
    refundCents = balanceCents;
  }

  settleSeq += 1;
  const settleNo = `ST-${input.visitId}-${settleSeq}`;
  const rec: SettlementRecord = {
    settleNo,
    visitId: input.visitId,
    type: 'discharge',
    dailyBill,
    totalCents,
    depositCents: acc.depositCents,
    consumedCents: acc.consumedCents,
    shortfallCents,
    refundCents,
    operatorId: input.operatorId,
    settledAt: now,
  };
  settlements.set(settleNo, rec);

  acc.status = 'settled';
  return rec;
}

/* ------------------------------------------------------------------ */
/* P0-5 深化：中途结算 + 一日清单推送                                     */
/* ------------------------------------------------------------------ */

import { assertVisitPatientBinding } from './orderCpoeAggregator.js';

// 中途结算幂等键（idempotencyKey）与一日清单（visitId|date）
const midByIdem = new Map<string, SettlementRecord>();
const dailyStatements = new Map<string, DailyStatement>();
let midSeq = 0;
let statementSeq = 0;

function todayStr(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 中途结算（住院期间对指定费用项做部分结算，非出院）。
 * - 行级 visitId-patientId 绑定；账户须 in_hospital，已出院 settled → 409
 * - items 必填、每条 cents 正整数、name 必填；totalCents=Σcents
 * - 幂等：同 idempotencyKey 重复提交 → 返回原单（200），不重复扣款
 * - 扣减：acc.consumedCents += totalCents（费用从押金余额中扣减）
 * - 写 SettlementRecord{type:'mid'}
 */
export function settleMid(input: {
  visitId: string;
  patientId: string;
  items: Array<{ name: string; cents: number }>;
  operatorId: string;
  operatorNote?: string;
  idempotencyKey?: string;
  now?: number;
}): SettlementRecord {
  const now = input.now ?? Date.now();
  if (!input.visitId) throw new InpatientDepositSettleError(400, 'visitId 必填');
  assertVisitPatientBinding(input.visitId, input.patientId);
  if (!input.operatorId) throw new InpatientDepositSettleError(400, 'operatorId 必填');
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new InpatientDepositSettleError(400, '中途结算明细不能为空');
  }

  if (input.idempotencyKey) {
    const hit = midByIdem.get(input.idempotencyKey);
    if (hit) return hit;
  }

  const acc = accounts.get(input.visitId);
  if (!acc) throw new InpatientDepositSettleError(404, `住院账户不存在: ${input.visitId}`);
  if (acc.status === 'settled') {
    throw new InpatientDepositSettleError(409, '该住院已出院结算，不可再中途结算');
  }
  if (acc.status !== 'in_hospital') {
    throw new InpatientDepositSettleError(409, '当前住院状态不可中途结算');
  }

  const dailyBill: BillItem[] = [];
  let totalCents = 0;
  for (const it of input.items) {
    if (!it.name) throw new InpatientDepositSettleError(400, '结算项目名称必填');
    if (!Number.isInteger(it.cents) || it.cents <= 0) {
      throw new InpatientDepositSettleError(400, '费用必须为正整数分');
    }
    dailyBill.push({ name: it.name, quantity: 1, unitPriceCents: it.cents, amountCents: it.cents });
    totalCents += it.cents;
  }
  if (!Number.isInteger(totalCents)) {
    throw new InpatientDepositSettleError(500, '费用合计非整数分');
  }

  midSeq += 1;
  acc.consumedCents += totalCents;
  const settleNo = `MID-${input.visitId}-${midSeq}`;
  const rec: SettlementRecord = {
    settleNo,
    visitId: input.visitId,
    type: 'mid',
    dailyBill,
    totalCents,
    depositCents: acc.depositCents,
    consumedCents: acc.consumedCents,
    shortfallCents: 0,
    refundCents: 0,
    operatorId: input.operatorId,
    operatorNote: input.operatorNote,
    settledAt: now,
  };
  settlements.set(settleNo, rec);
  if (input.idempotencyKey) midByIdem.set(input.idempotencyKey, rec);
  return rec;
}

/**
 * 一日清单推送：生成当日费用清单（费用项 + 押金余额 + 累计费用）并写推送记录。
 * - 行级绑定；同 visitId+statementDate 重复推送 → 返回原清单（幂等 200）
 * - items 取该住院已结算（含中途结算）费用项；totalCents=acc.consumedCents；
 *   depositBalanceCents=depositCents-consumedCents。
 */
export function pushDailyStatement(input: {
  visitId: string;
  patientId: string;
  statementDate?: string;
  operatorId?: string;
  now?: number;
}): DailyStatement {
  const now = input.now ?? Date.now();
  if (!input.visitId) throw new InpatientDepositSettleError(400, 'visitId 必填');
  assertVisitPatientBinding(input.visitId, input.patientId);

  const acc = accounts.get(input.visitId);
  if (!acc) throw new InpatientDepositSettleError(404, `住院账户不存在: ${input.visitId}`);

  const date = input.statementDate ?? todayStr(now);
  const key = `${input.visitId}|${date}`;
  const existing = dailyStatements.get(key);
  if (existing) return existing;

  // 汇总该住院已结算费用项（同名合并）
  const agg = new Map<string, number>();
  for (const s of settlements.values()) {
    if (s.visitId !== input.visitId) continue;
    for (const b of s.dailyBill) {
      agg.set(b.name, (agg.get(b.name) ?? 0) + b.amountCents);
    }
  }
  const items = Array.from(agg.entries()).map(([name, amountCents]) => ({ name, amountCents }));
  const totalCents = acc.consumedCents;
  const depositBalanceCents = acc.depositCents - acc.consumedCents;

  statementSeq += 1;
  const rec: DailyStatement = {
    statementNo: `DS-${input.visitId}-${statementSeq}`,
    visitId: input.visitId,
    patientId: acc.patientId,
    statementDate: date,
    items,
    totalCents,
    depositBalanceCents,
    pushedBy: input.operatorId,
    pushedAt: now,
  };
  dailyStatements.set(key, rec);
  return rec;
}

/** 按 visitId 查住院账户 */
export function getAccount(visitId: string): InpatientAccount {
  if (!visitId) throw new InpatientDepositSettleError(400, 'visitId 必填');
  const acc = accounts.get(visitId);
  if (!acc) throw new InpatientDepositSettleError(404, `住院账户不存在: ${visitId}`);
  return acc;
}

/** 按 visitId 列出预交金记录 */
export function listDeposits(visitId: string): DepositRecord[] {
  if (!visitId) throw new InpatientDepositSettleError(400, 'visitId 必填');
  return Array.from(deposits.values()).filter((d) => d.visitId === visitId);
}

/** 列出全部出院结算记录 */
export function listSettlements(): SettlementRecord[] {
  return Array.from(settlements.values());
}

/** 单测隔离：清空台账并重播种子数据。 */
export function __resetStore(): void {
  accounts.clear();
  deposits.clear();
  settlements.clear();
  midByIdem.clear();
  dailyStatements.clear();
  depositSeqs.clear();
  settleSeq = 0;
  midSeq = 0;
  statementSeq = 0;
  seedDemoAccounts();
}

// 模块加载时即播种子（DEMO 演示数据）。
seedDemoAccounts();
