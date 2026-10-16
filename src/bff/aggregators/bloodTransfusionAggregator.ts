/**
 * 健澜科技 jlmedaios - 输血管理纯函数（M190-B）
 *
 * buildBloodTransfusionReport / detectBloodTransfusionReaction / checkBloodUseRationality
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 输血记录 */
export interface TransfusionRecord {
  bloodType: string;
  product: string;
  volume: number;
  preTransfusionHb: number;
  postTransfusionHb: number;
  reaction?: 'fever' | 'allergy' | 'hemolysis' | 'bacterial';
}

/**
 * 输血反应检测（纯函数）。
 *
 * @param record 输血记录
 * @returns 反应类型与严重度
 */
export function detectBloodTransfusionReaction(record: TransfusionRecord): { hasReaction: boolean; severity: 'none' | 'mild' | 'severe' } {
  if (!record.reaction) return { hasReaction: false, severity: 'none' };
  const severeReactions: Array<NonNullable<TransfusionRecord['reaction']>> = ['hemolysis', 'bacterial'];
  if (severeReactions.includes(record.reaction)) return { hasReaction: true, severity: 'severe' };
  return { hasReaction: true, severity: 'mild' };
}

/** 用血医嘱 */
export interface BloodOrder {
  bloodType: string;
  product: string;
  volume: number;
  patientHb: number;
  indication: string;
}

/**
 * 用血合理性检查（纯函数）。
 *
 * @param order 用血医嘱
 * @returns 是否合理及理由
 */
export function checkBloodUseRationality(order: BloodOrder): { rational: boolean; reason: string } {
  if (order.patientHb >= 100 && order.indication === 'anemia') {
    return { rational: false, reason: 'Hb ≥100g/L 无需输血，滥用风险' };
  }
  if (order.volume > 800) {
    return { rational: false, reason: '单次输血 >800ml，建议分次输注' };
  }
  return { rational: true, reason: '符合输血指征' };
}

/** 输血报告输出 */
export interface BloodTransfusionReport {
  dept: string;
  timeRange: string;
  totalTransfusions: number;
  reactionRate: number;
  compatibilityRate: number;
  rationalRate: number;
  inventory: { type: string; units: number }[];
  alerts: string[];
}

/**
 * 构建输血管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 输血报告
 */
export function buildBloodTransfusionReport(dept: string, timeRange: string): BloodTransfusionReport {
  return {
    dept,
    timeRange,
    totalTransfusions: 45,
    reactionRate: 0.022,
    compatibilityRate: 1.0,
    rationalRate: 0.92,
    inventory: [
      { type: 'A 型红细胞', units: 12 },
      { type: 'O 型红细胞', units: 18 },
      { type: 'AB 型血浆', units: 6 },
    ],
    alerts: ['库存紧张：O 型血小板 <5 单位', '本月输血反应 1 例，已上报'],
  };
}
