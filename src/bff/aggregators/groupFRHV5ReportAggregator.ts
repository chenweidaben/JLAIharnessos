/**
 * 健澜科技 jlmedaios - 集团财务人力物资 V5 纯函数（M273-B）
 *
 * consolidateFinanceV5 / centralizeProcurementV5 / buildGroupFRHV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 合并报表 V5（纯函数）。
 *
 * @param subsidiaries 子公司收入列表
 * @returns 合并结果
 */
export function consolidateFinanceV5(subsidiaries: { name: string; revenue: number; cost: number }[]): { totalRevenue: number; totalCost: number; profit: number; entityCount: number } {
  const totalRevenue = subsidiaries.reduce((s, x) => s + x.revenue, 0);
  const totalCost = subsidiaries.reduce((s, x) => s + x.cost, 0);
  const profit = totalRevenue - totalCost;
  return { totalRevenue, totalCost, profit, entityCount: subsidiaries.length };
}

/**
 * 集中采购 V5（纯函数）。
 *
 * @param items 采购品项
 * @param group 集团是否集中
 * @returns 集中采购结果
 */
export function centralizeProcurementV5(items: number, group: boolean): { centralized: number; saving: number; rate: number } {
  const centralized = group ? items : Math.floor(items * 0.3);
  const saving = centralized * 5000;
  const rate = items > 0 ? Math.round((centralized / items) * 1000) / 10 : 0;
  return { centralized, saving, rate };
}

/** 集团财务人力物资 V5 报告输出 */
export interface GroupFRHV5Report {
  timeRange: string;
  finance: { consolidatedReport: number; unifiedAccounting: number; fundPool: number; centralizedBudget: number; internalTransaction: number };
  hr: { unifiedPersonnel: number; establishment: number; recruitment: number; compensation: number; title: number; talentPool: number };
  materials: { centralizedProcurement: number; unifiedCatalog: number; spdGroupWarehouse: number; crossCampusAllocation: number };
  assets: { unifiedLedger: number; crossCampusDeployment: number; equipmentSharing: number; depreciation: number; inventory: number };
  budget: { unifiedBudget: number; decomposition: number; execution: number; analysis: number; assessment: number; rollingForecast: number };
  contract: { unifiedTemplate: number; legal: number; approval: number; performance: number; payment: number; risk: number };
  policy: { unifiedStandard: number; process: number; sop: number; quality: number; safety: number; training: number };
  metrics: { centralizedProcurementRate: number; fundConcentration: number; unifiedRecruitmentRate: number; costReduction: number };
  suggestions: string[];
}

/**
 * 构建集团财务人力物资 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildGroupFRHV5Report(timeRange: string): GroupFRHV5Report {
  return {
    timeRange,
    finance: { consolidatedReport: 12, unifiedAccounting: 1, fundPool: 1, centralizedBudget: 1, internalTransaction: 200 },
    hr: { unifiedPersonnel: 1, establishment: 3000, recruitment: 500, compensation: 1, title: 800, talentPool: 200 },
    materials: { centralizedProcurement: 1, unifiedCatalog: 1, spdGroupWarehouse: 1, crossCampusAllocation: 50 },
    assets: { unifiedLedger: 1, crossCampusDeployment: 30, equipmentSharing: 100, depreciation: 1, inventory: 1 },
    budget: { unifiedBudget: 1, decomposition: 1, execution: 85, analysis: 1, assessment: 1, rollingForecast: 1 },
    contract: { unifiedTemplate: 1, legal: 1, approval: 1, performance: 1, payment: 1, risk: 1 },
    policy: { unifiedStandard: 1, process: 1, sop: 1, quality: 1, safety: 1, training: 1 },
    metrics: { centralizedProcurementRate: 80, fundConcentration: 75, unifiedRecruitmentRate: 90, costReduction: 12 },
    suggestions: [
      "提升资金集中度，降低财务成本",
      "扩大集中采购范围",
      "统一薪酬体系，减少人才流失",
    ],
  };
}
