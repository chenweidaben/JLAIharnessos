/**
 * 健澜科技 jlmedaios - 医保 DRG/DIP 管理深化 V3 纯函数（M205-C）
 *
 * buildInsuranceReportV3 / calculateDRGWeight / assessCostStructure
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** DRG 分组数据 */
export interface DRGGroup {
  mdc: string;
  adrg: string;
  cost: number;
  avgCost: number;
}

/**
 * 计算 DRG 权重（纯函数）。
 *
 * @param group DRG 分组数据
 * @returns 权重与盈亏
 */
export function calculateDRGWeight(group: DRGGroup): { weight: number; profit: number; loss: boolean } {
  const weight = group.avgCost > 0 ? group.cost / group.avgCost : 0;
  const profit = group.avgCost - group.cost;
  return { weight, profit, loss: profit < 0 };
}

/** 费用结构 */
export interface CostBill {
  total: number;
  drugCost: number;
  materialCost: number;
  selfPay: number;
}

/**
 * 评估费用结构（纯函数）。
 *
 * @param bill 费用结构
 * @returns 评估
 */
export function assessCostStructure(bill: CostBill): { drugRatio: number; materialRatio: number; selfPayRatio: number; reasonable: boolean } {
  const drugRatio = bill.total > 0 ? bill.drugCost / bill.total : 0;
  const materialRatio = bill.total > 0 ? bill.materialCost / bill.total : 0;
  const selfPayRatio = bill.total > 0 ? bill.selfPay / bill.total : 0;
  return { drugRatio, materialRatio, selfPayRatio, reasonable: drugRatio < 0.3 && selfPayRatio < 0.2 };
}

/** 医保 V3 报告输出 */
export interface InsuranceReportV3 {
  timeRange: string;
  drg: { groupingRate: number; lowAdmission: number; upCoding: number; mainDxSelection: number };
  dip: { diseaseScore: number; pointValue: number; totalBudget: number; surplusRetention: number };
  cost: { avgPerVisit: number; drugRatio: number; materialRatio: number; selfPayRatio: number };
  settlement: { settled: number; pending: number };
  audit: { preAudit: number; duringAudit: number; postAudit: number };
  assessment: { creditRating: string };
  suggestions: string[];
}

/**
 * 构建医保 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 医保 V3 报告
 */
export function buildInsuranceReportV3(timeRange: string): InsuranceReportV3 {
  return {
    timeRange,
    drg: { groupingRate: 0.98, lowAdmission: 50, upCoding: 20, mainDxSelection: 0.9 },
    dip: { diseaseScore: 10000, pointValue: 10, totalBudget: 50000000, surplusRetention: 5000000 },
    cost: { avgPerVisit: 8000, drugRatio: 0.25, materialRatio: 0.15, selfPayRatio: 0.1 },
    settlement: { settled: 100000, pending: 5000 },
    audit: { preAudit: 100000, duringAudit: 50000, postAudit: 10000 },
    assessment: { creditRating: 'A' },
    suggestions: ['降低药占比', '提高 DRG 入组准确率'],
  };
}
