/**
 * 健澜科技 jlmedaios — 药品全生命周期聚合器（M153-B）
 *
 * 采购入库 → 库存 → 处方 → 不良反应 全链路批次级追溯。
 * 临床决策支持：
 *  - trackDrugBatch：登记/更新一个批号（最小追溯单元）；
 *  - detectExpiringDrugs：近效期自动预警（默认 ≤90 天），按紧急度分级；
 *  - recallDrugBatch：问题批次一键召回——仅把指定批号置为 recalled，
 *    同一药品的其他批号仍 active、正常销售（召回精确到批次，绝不全停）；
 *  - getAdverseReactionReport：按药品聚合不良反应上报。
 *
 * 纯函数约定：本模块四个核心函数均无网络/DB I/O，操作内存批次注册表，
 * 输入确定则输出确定，可直接单测；生产持久化目标表为 clinical.drug_lifecycle。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 批次状态 */
export type BatchStatus = 'active' | 'recalled' | 'expired' | 'discarded';

/** 不良反应条目（挂在批次行上） */
export interface AdverseEntry {
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  count: number;
  lastReportedAt: string;
}

/** 一个药品批次（全生命周期追溯单元） */
export interface Batch {
  batchNo: string;
  drugId: string;
  drugCode: string;
  drugName: string;
  /** 生产日期 YYYY-MM-DD */
  productionDate: string;
  /** 失效日期 YYYY-MM-DD */
  expiryDate: string;
  supplier: string;
  quantity: number;
  unit: string;
  status: BatchStatus;
  recallReason: string | null;
  recalledAt: string | null;
  /** 该批号已发药人次（处方追溯） */
  dispensedCount: number;
  adverse: AdverseEntry[];
}

/** 效期紧急度：critical ≤30天 / warning ≤60天 / notice ≤90天 */
export type ExpiryRisk = 'critical' | 'warning' | 'notice';

/** 近效期预警批次：在批次基础上附加距效期天数与紧急度 */
export interface ExpiringBatch extends Batch {
  /** 距失效日天数（负数表示已过期） */
  daysToExpiry: number;
  riskLevel: ExpiryRisk;
}

/** 召回结果 */
export interface RecallResult {
  batchNo: string;
  drugId: string;
  drugName: string;
  /** recalled = 召回成功；not_found = 批号不存在；already_recalled = 已召回 */
  result: 'recalled' | 'not_found' | 'already_recalled';
  status: BatchStatus;
  reason: string | null;
  recalledAt: string | null;
  /** 本次被锁定停售的数量（仅本批次） */
  affectedQuantity: number;
  /** 同药品仍在正常销售的其他批次数（验证批次级召回、未误伤） */
  otherActiveBatches: number;
  message: string;
}

/** 药品不良反应聚合报告 */
export interface AdverseReport {
  drugId: string;
  drugName: string;
  totalReports: number;
  severeCount: number;
  reactions: AdverseEntry[];
  lastReportedAt: string | null;
}

/** 生命周期视图（GET /lifecycle 返回） */
export interface LifecycleView {
  totalBatches: number;
  activeBatches: number;
  recalledBatches: number;
  expiringBatches: ExpiringBatch[];
  batches: Batch[];
  demo: boolean;
  scannedAt: string;
}

// ---------------------------------------------------------------------------
// 内存批次注册表（纯函数的操作对象；生产由 clinical.drug_lifecycle 持久化）
// ---------------------------------------------------------------------------

/** drugId → 药品目录（名称/编码），便于按批号反查展示名 */
const DRUG_CATALOG = new Map<string, { drugCode: string; drugName: string }>([
  ['D-CTX', { drugCode: 'XB2023001', drugName: '注射用头孢曲松钠' }],
  ['D-LEV', { drugCode: 'XB2023002', drugName: '盐酸左氧氟沙星注射液' }],
  ['D-MER', { drugCode: 'XB2023004', drugName: '美罗培南注射剂' }],
  ['D-OME', { drugCode: 'XB2023005', drugName: '奥美拉唑肠溶胶囊' }],
  ['D-ALB', { drugCode: 'XB2023006', drugName: '人血白蛋白注射液' }],
]);

/** 批次注册表：batchNo -> Batch */
const REGISTRY = new Map<string, Batch>();

/** 近效期预警默认窗口（天） */
export const DEFAULT_EXPIRY_DAYS = 90;

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 取今天 0 点的 ISO 日期串（YYYY-MM-DD） */
function todayStr(): string {
  const d = new Date();
  return toDateStr(d);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 以 today 为基准偏移 days 天，返回 YYYY-MM-DD */
function shiftDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** 距失效日天数（ceil）；expiry 非法返回 NaN */
function daysUntil(expiryDate: string): number {
  const exp = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(exp.getTime())) return NaN;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / 86400_000);
}

/** 由距效期天数推紧急度 */
function riskOf(days: number): ExpiryRisk {
  if (days <= 30) return 'critical';
  if (days <= 60) return 'warning';
  return 'notice';
}

// ---------------------------------------------------------------------------
// 纯函数 1：批次登记
// ---------------------------------------------------------------------------

/**
 * 登记/更新一个药品批次（采购入库节点）。
 *  - 已存在批号则更新生产/效期/供应商/数量，保留召回与不良反应历史；
 *  - 返回登记后的批次快照。
 *
 * @param batchNo       批号（追溯主键）
 * @param drugId        药品 ID
 * @param productionDate 生产日期 YYYY-MM-DD
 * @param expiryDate    失效日期 YYYY-MM-DD
 * @param supplier      供应商
 */
export function trackDrugBatch(
  batchNo: string,
  drugId: string,
  productionDate: string,
  expiryDate: string,
  supplier: string,
): Batch {
  const bn = String(batchNo ?? '').trim();
  const catalog = DRUG_CATALOG.get(drugId) ?? { drugCode: '', drugName: drugId };
  const existing = REGISTRY.get(bn);

  // 过期判定：已过效期的新批次直接置 expired，不允许上架
  const dLeft = daysUntil(expiryDate);
  const autoStatus: BatchStatus = Number.isFinite(dLeft) && dLeft < 0 ? 'expired' : 'active';

  const batch: Batch = {
    batchNo: bn,
    drugId,
    drugCode: catalog.drugCode,
    drugName: catalog.drugName,
    productionDate,
    expiryDate,
    supplier,
    quantity: existing?.quantity ?? 100,
    unit: existing?.unit ?? '盒',
    status: existing?.status ?? autoStatus,
    recallReason: existing?.recallReason ?? null,
    recalledAt: existing?.recalledAt ?? null,
    dispensedCount: existing?.dispensedCount ?? 0,
    adverse: existing?.adverse ?? [],
  };
  REGISTRY.set(bn, batch);
  return { ...batch };
}

// ---------------------------------------------------------------------------
// 纯函数 2：近效期自动预警
// ---------------------------------------------------------------------------

/**
 * 扫描在库（active）批次，返回距效期 ≤ days 天的批次。
 *  - 已召回/已过期/已报损的批次不参与"待销售预警"；
 *  - 按距效期天数升序（最紧急在前）；
 *  - 默认窗口 90 天（临床决策支持：提前调拨/先用尽）。
 *
 * @param days 预警窗口（天）；非法/非正按 DEFAULT_EXPIRY_DAYS 处理
 */
export function detectExpiringDrugs(days: number): ExpiringBatch[] {
  const window = Number.isFinite(days) && (days as number) > 0
    ? Math.floor(days as number)
    : DEFAULT_EXPIRY_DAYS;

  const result: ExpiringBatch[] = [];
  for (const b of REGISTRY.values()) {
    if (b.status !== 'active') continue; // 召回/过期/报损不预警
    const left = daysUntil(b.expiryDate);
    if (!Number.isFinite(left)) continue;
    if (left <= window) {
      result.push({ ...b, daysToExpiry: left, riskLevel: riskOf(left) });
    }
  }
  return result.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

// ---------------------------------------------------------------------------
// 纯函数 3：批次召回
// ---------------------------------------------------------------------------

/**
 * 召回指定批号——精确到批次，绝不全停。
 *  - 仅把 batchNo 这一批置为 recalled，同药品其他批次仍 active 正常销售；
 *  - 返回受影响数量与"其他仍在销售批次数"，供审计与前端确认误伤范围为 0。
 *
 * @param batchNo 问题批号
 * @param reason  召回原因（临床/质量/药监通报）
 */
export function recallDrugBatch(batchNo: string, reason: string): RecallResult {
  const bn = String(batchNo ?? '').trim();
  const batch = REGISTRY.get(bn);
  if (!batch) {
    return {
      batchNo: bn,
      drugId: '',
      drugName: '',
      result: 'not_found',
      status: 'expired',
      reason: reason ?? null,
      recalledAt: null,
      affectedQuantity: 0,
      otherActiveBatches: 0,
      message: `批号 ${bn} 不存在，无需召回`,
    };
  }

  if (batch.status === 'recalled') {
    return {
      batchNo: bn,
      drugId: batch.drugId,
      drugName: batch.drugName,
      result: 'already_recalled',
      status: 'recalled',
      reason: batch.recallReason,
      recalledAt: batch.recalledAt,
      affectedQuantity: batch.quantity,
      otherActiveBatches: countOtherActive(batch.drugId, bn),
      message: `批号 ${bn} 已处于召回状态，不重复操作`,
    };
  }

  batch.status = 'recalled';
  batch.recallReason = reason ?? null;
  batch.recalledAt = new Date().toISOString();
  REGISTRY.set(bn, { ...batch });

  const others = countOtherActive(batch.drugId, bn);
  return {
    batchNo: bn,
    drugId: batch.drugId,
    drugName: batch.drugName,
    result: 'recalled',
    status: 'recalled',
    reason: reason ?? null,
    recalledAt: batch.recalledAt,
    affectedQuantity: batch.quantity,
    otherActiveBatches: others,
    message: `已召回批号 ${bn}（仅停本批次 ${batch.quantity}${batch.unit}），同药品其他 ${others} 个批次正常销售`,
  };
}

/** 统计同药品、排除指定批号后仍 active 的批次数 */
function countOtherActive(drugId: string, excludeBatchNo: string): number {
  let n = 0;
  for (const b of REGISTRY.values()) {
    if (b.drugId === drugId && b.batchNo !== excludeBatchNo && b.status === 'active') n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// 纯函数 4：不良反应报告
// ---------------------------------------------------------------------------

/**
 * 按药品聚合不良反应上报（跨该药品所有批次）。
 *  - 同一反应名合并计数，取最高严重度；
 *  - 无上报时返回空报告（totalReports=0）。
 *
 * @param drugId 药品 ID
 */
export function getAdverseReactionReport(drugId: string): AdverseReport {
  const byReaction = new Map<string, AdverseEntry>();
  let drugName = drugId;
  let total = 0;
  let severe = 0;
  let lastAt: string | null = null;

  for (const b of REGISTRY.values()) {
    if (b.drugId !== drugId) continue;
    drugName = b.drugName || drugName;
    for (const a of b.adverse) {
      total += a.count;
      if (a.severity === 'severe') severe += a.count;
      const cur = byReaction.get(a.reaction);
      if (!cur) {
        byReaction.set(a.reaction, { ...a });
      } else {
        cur.count += a.count;
        if (severityRank(a.severity) > severityRank(cur.severity)) cur.severity = a.severity;
        if (!cur.lastReportedAt || a.lastReportedAt > cur.lastReportedAt) {
          cur.lastReportedAt = a.lastReportedAt;
        }
      }
      if (!lastAt || a.lastReportedAt > lastAt) lastAt = a.lastReportedAt;
    }
  }

  const reactions = [...byReaction.values()].sort((x, y) => y.count - x.count);
  return { drugId, drugName, totalReports: total, severeCount: severe, reactions, lastReportedAt: lastAt };
}

function severityRank(s: 'mild' | 'moderate' | 'severe'): number {
  return s === 'severe' ? 3 : s === 'moderate' ? 2 : 1;
}

// ---------------------------------------------------------------------------
// 不良反应上报（供路由/测试写入，支撑 getAdverseReactionReport）
// ---------------------------------------------------------------------------

/** 记录一条不良反应上报到指定批次 */
export function reportAdverseReaction(
  batchNo: string,
  reaction: string,
  severity: 'mild' | 'moderate' | 'severe',
): void {
  const b = REGISTRY.get(String(batchNo ?? '').trim());
  if (!b) return;
  const entry = b.adverse.find((x) => x.reaction === reaction);
  const now = new Date().toISOString();
  if (entry) {
    entry.count += 1;
    entry.lastReportedAt = now;
  } else {
    b.adverse.push({ reaction, severity, count: 1, lastReportedAt: now });
  }
  REGISTRY.set(b.batchNo, { ...b });
}

// ---------------------------------------------------------------------------
// 演示数据 + 视图入口
// ---------------------------------------------------------------------------

/** 清空注册表（测试隔离用） */
export function _resetRegistry(): void {
  REGISTRY.clear();
}

/** 是否已灌入演示数据 */
let seeded = false;

/** 灌入演示批次：覆盖 近效期/正常/同药多批次/不良反应 几种情形 */
export function seedDemoBatches(): void {
  if (seeded) return;
  seeded = true;
  // D-CTX 头孢曲松：两批，一批近效期将被召回演示，另一批正常销售
  trackDrugBatch('B20260311', 'D-CTX', shiftDate(-300), shiftDate(45), '华北制药股份');
  trackDrugBatch('B20260901', 'D-CTX', shiftDate(-30), shiftDate(300), '华北制药股份');
  // D-LEV 左氧氟沙星：近效期（20天，critical）
  trackDrugBatch('B20260502', 'D-LEV', shiftDate(-200), shiftDate(20), '扬子江药业');
  // D-MER 美罗培南：效期 75 天（notice）
  trackDrugBatch('B20260418', 'D-MER', shiftDate(-260), shiftDate(75), '深圳市海滨制药');
  // D-OME 奥美拉唑：效期 200 天（不预警）
  trackDrugBatch('B20260610', 'D-OME', shiftDate(-100), shiftDate(200), '阿斯利康');
  // D-ALB 人血白蛋白：带不良反应上报
  trackDrugBatch('B20260220', 'D-ALB', shiftDate(-180), shiftDate(120), '上海莱士');
  reportAdverseReaction('B20260220', '皮疹瘙痒', 'mild');
  reportAdverseReaction('B20260220', '皮疹瘙痒', 'mild');
  reportAdverseReaction('B20260220', '寒战发热', 'moderate');
}

/**
 * 全生命周期视图：批次台账 + 近效期预警汇总。
 * 无任何批次时自动灌入演示数据（demo:true）。
 */
export function lifecycleView(): LifecycleView {
  seedDemoBatches();
  const batches = [...REGISTRY.values()].map((b) => ({ ...b }));
  const expiring = detectExpiringDrugs(DEFAULT_EXPIRY_DAYS);
  return {
    totalBatches: batches.length,
    activeBatches: batches.filter((b) => b.status === 'active').length,
    recalledBatches: batches.filter((b) => b.status === 'recalled').length,
    expiringBatches: expiring,
    batches,
    demo: true, // 当前为内存演示注册表；接入 clinical.drug_lifecycle 后切换真实数据
    scannedAt: new Date().toISOString(),
  };
}
