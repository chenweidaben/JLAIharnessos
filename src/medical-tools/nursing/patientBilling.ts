/**
 * 健澜科技 jlmedaios - 患者端住院费用/医保预估/押金余额引擎（M50-A）
 *
 * 纯函数、确定性、无 I/O、无随机。负责：
 *  - 押金余额 = 已缴押金/已付 − 已产生费用；
 *  - 医保结算预估（患者自付 = 已产生费用 × (1 − 报销比例)）；
 *  - 按业务类别（药品/检查/治疗/材料）汇总费用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 业务费用大类（患者端展示口径）。 */
export type BillingCategory = 'drug' | 'exam' | 'treatment' | 'material' | 'other';

export interface CostBreakdown {
  /** 各业务类别的合计金额（元，非负）。 */
  byCategory: Record<BillingCategory, number>;
  /** 总合计 = Σ byCategory。 */
  total: number;
}

export interface InsuranceEstimate {
  /** 预计医保报销金额。 */
  estimatedInsurancePaid: number;
  /** 预计患者自付金额。 */
  patientOutOfPocket: number;
  /** 采用的报销比例（0~1）。 */
  rate: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * 押金余额 = 已缴（押金/已付）− 已产生费用。
 * 允许为负（欠费）；入参非数字按 0 处理。
 */
export function depositBalance(depositPaid: number, totalCharged: number): number {
  const paid = Number.isFinite(depositPaid) ? depositPaid : 0;
  const charged = Number.isFinite(totalCharged) ? totalCharged : 0;
  return round2(paid - charged);
}

/**
 * 医保结算预估：患者自付 = totalCharged × (1 − insuranceRate)。
 * rate 裁剪到 [0,1]；totalCharged 非负。
 */
export function estimateInsuranceSettlement(totalCharged: number, insuranceRate: number): InsuranceEstimate {
  const charged = Number.isFinite(totalCharged) && totalCharged > 0 ? totalCharged : 0;
  const rate = Number.isFinite(insuranceRate) ? Math.min(1, Math.max(0, insuranceRate)) : 0;
  const patientOutOfPocket = round2(charged * (1 - rate));
  const estimatedInsurancePaid = round2(charged - patientOutOfPocket);
  return { estimatedInsurancePaid, patientOutOfPocket, rate };
}

/**
 * 把明细行按业务大类归组汇总。
 *  - drug（药品）：category = 'drug'
 *  - exam（检查）：category ∈ lab / imaging
 *  - treatment（治疗）：category ∈ treatment / surgery / nursing / bed
 *  - material（材料）：category = material
 *  - other（其它）：registration / consultation / other
 */
export function categorizeFeeCategory(raw: string): BillingCategory {
  switch (raw) {
    case 'drug':
      return 'drug';
    case 'lab':
    case 'imaging':
      return 'exam';
    case 'treatment':
    case 'surgery':
    case 'nursing':
    case 'bed':
      return 'treatment';
    case 'material':
      return 'material';
    default:
      return 'other';
  }
}

export interface FeeLine {
  category: string;
  amount: number;
}

/** 按业务大类汇总费用明细。 */
export function buildCostBreakdown(lines: FeeLine[]): CostBreakdown {
  const byCategory: Record<BillingCategory, number> = {
    drug: 0, exam: 0, treatment: 0, material: 0, other: 0,
  };
  let total = 0;
  for (const line of lines) {
    const amt = Number.isFinite(line.amount) && line.amount > 0 ? line.amount : 0;
    const cat = categorizeFeeCategory(line.category ?? 'other');
    byCategory[cat] += amt;
    total += amt;
  }
  (Object.keys(byCategory) as BillingCategory[]).forEach((k) => {
    byCategory[k] = round2(byCategory[k]);
  });
  return { byCategory, total: round2(total) };
}
