/**
 * 健澜科技 jlmedaios - 医院成本核算纯函数（M189-B）
 *
 * buildCostAccountingReport / calculateDeptCost / calculateDiseaseCost
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 科室成本数据 */
export interface DeptCostData {
  personnel: number;
  drugs: number;
  consumables: number;
  depreciation: number;
  overhead: number;
}

/**
 * 科室总成本（纯函数）。
 *
 * @param data 科室成本数据
 * @returns 总成本
 */
export function calculateDeptCost(data: DeptCostData): number {
  return Math.round(data.personnel + data.drugs + data.consumables + data.depreciation + data.overhead);
}

/** 病种成本数据 */
export interface DiseaseCostData {
  drugCost: number;
  consumableCost: number;
  bedCost: number;
  laborCost: number;
}

/**
 * 病种总成本（纯函数）。
 *
 * @param data 病种成本数据
 * @returns 单病种成本
 */
export function calculateDiseaseCost(data: DiseaseCostData): number {
  return Math.round(data.drugCost + data.consumableCost + data.bedCost + data.laborCost);
}

/** 成本核算报告输出 */
export interface CostAccountingReport {
  dept: string;
  timeRange: string;
  deptTotalCost: number;
  costStructure: { personnel: number; drugs: number; consumables: number; depreciation: number; overhead: number };
  budget: number;
  costControlRate: number;
  diseaseCosts: Array<{ disease: string; cost: number }>;
  suggestions: string[];
}

/**
 * 构建成本核算报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 成本报告
 */
export function buildCostAccountingReport(dept: string, timeRange: string): CostAccountingReport {
  const costData: DeptCostData = {
    personnel: 1200000,
    drugs: 800000,
    consumables: 300000,
    depreciation: 150000,
    overhead: 200000,
  };

  const deptTotalCost = calculateDeptCost(costData);
  const budget = 2800000;
  const costControlRate = Math.round((deptTotalCost / budget) * 1000) / 10;

  const diseaseCosts = [
    { disease: '冠心病', cost: calculateDiseaseCost({ drugCost: 8000, consumableCost: 5000, bedCost: 3000, laborCost: 4000 }) },
    { disease: '肺炎', cost: calculateDiseaseCost({ drugCost: 3000, consumableCost: 1000, bedCost: 2000, laborCost: 2000 }) },
  ];

  const suggestions: string[] = [];
  if (costControlRate > 100) {
    suggestions.push(`成本控制率 ${costControlRate}%，超预算，建议分析超支原因`);
  }
  if (costData.drugs / deptTotalCost > 0.3) {
    suggestions.push('药品占比过高，建议加强处方点评');
  }

  return {
    dept,
    timeRange,
    deptTotalCost,
    costStructure: costData,
    budget,
    costControlRate,
    diseaseCosts,
    suggestions,
  };
}
