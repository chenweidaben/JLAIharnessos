/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS 规则引擎（M18-A）
 *
 * 纯函数、确定性、无 DB、无随机。输入药品/剂量/途径/频次 + 患者过敏列表 +
 * 该就诊活跃医嘱列表，产出 alerts[]。
 *   hard  = allergy（过敏命中，拦截，须 override）
 *   warn  = duplicate_active_order（同药重复活跃医嘱）/ frequent_dose（频次过频）
 *   info  = dose_range（剂量边缘/超参考范围提醒）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type CdsRuleCode = 'allergy' | 'duplicate_active_order' | 'dose_range' | 'frequent_dose';
export type CdsSeverity = 'info' | 'warn' | 'hard';

export interface CdsAlert {
  ruleCode: CdsRuleCode;
  severity: CdsSeverity;
  message: string;
}

export interface OrderInput {
  drugName: string;
  doseMg: number;
  frequencyPerDay: number;
}

export interface ActiveOrder {
  drugName: string;
  status?: string;
}

/** 内置小剂量参考范围（mg/次）。仅做演示级 CDS。 */
const DOSE_RANGE: Record<string, { min: number; max: number }> = {
  paracetamol: { min: 200, max: 1000 },
  amoxicillin: { min: 250, max: 1000 },
  metoprolol: { min: 12.5, max: 100 },
};

/** 单日最大频次（次/日）演示阈值。 */
const MAX_FREQ_PER_DAY = 6;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * 跑规则。
 * @param allergies 患者过敏药品名列表（标准化后小写）
 */
export function evaluateCds(
  order: OrderInput,
  allergies: string[],
  activeOrders: ActiveOrder[],
): CdsAlert[] {
  const alerts: CdsAlert[] = [];
  const drug = norm(order.drugName);

  // 1) 过敏 hard
  if (allergies.some((a) => norm(a) === drug)) {
    alerts.push({ ruleCode: 'allergy', severity: 'hard', message: `患者对 ${order.drugName} 过敏` });
  }

  // 2) 重复活跃医嘱 warn
  const dup = activeOrders.some((o) => norm(o.drugName) === drug && (o.status ?? 'active') === 'active');
  if (dup) {
    alerts.push({ ruleCode: 'duplicate_active_order', severity: 'warn', message: `存在同药 ${order.drugName} 活跃医嘱` });
  }

  // 3) 剂量范围 info
  const range = DOSE_RANGE[drug];
  if (range && (order.doseMg < range.min || order.doseMg > range.max)) {
    alerts.push({ ruleCode: 'dose_range', severity: 'info', message: `剂量 ${order.doseMg}mg 超出参考 ${range.min}-${range.max}mg` });
  }

  // 4) 频次过频 warn
  if (order.frequencyPerDay > MAX_FREQ_PER_DAY) {
    alerts.push({ ruleCode: 'frequent_dose', severity: 'warn', message: `频次 ${order.frequencyPerDay} 次/日 超过 ${MAX_FREQ_PER_DAY}` });
  }

  return alerts;
}

/** 是否有 hard 级未 override 告警。 */
export function hasHardBlock(alerts: CdsAlert[]): boolean {
  return alerts.some((a) => a.severity === 'hard');
}
