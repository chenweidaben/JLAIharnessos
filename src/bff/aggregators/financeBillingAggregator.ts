/**
 * 健澜科技 jlmedaios - 财务收费管理深化纯函数（M192-A）
 *
 * buildFinanceBillingReport / calculateRevenueStructure / predictFinancialTrend
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 收入数据 */
export interface RevenueData {
  outpatient: { registration: number; consultation: number; exam: number; treatment: number; drug: number; material: number };
  inpatient: { bed: number; nursing: number; surgery: number; anesthesia: number; drug: number; material: number };
  insurance: { pooling: number; personal: number; selfPay: number; selfExpense: number; seriousIllness: number };
}

/**
 * 收入结构计算（纯函数）。
 *
 * @param data 收入数据
 * @returns 总收入及各占比
 */
export function calculateRevenueStructure(data: RevenueData): { total: number; outpatientRatio: number; inpatientRatio: number; drugRatio: number; materialRatio: number } {
  const outpatientTotal = Object.values(data.outpatient).reduce((a, b) => a + b, 0);
  const inpatientTotal = Object.values(data.inpatient).reduce((a, b) => a + b, 0);
  const drugTotal = data.outpatient.drug + data.inpatient.drug;
  const materialTotal = data.outpatient.material + data.inpatient.material;
  const total = outpatientTotal + inpatientTotal;
  return {
    total,
    outpatientRatio: Math.round((outpatientTotal / total) * 1000) / 10,
    inpatientRatio: Math.round((inpatientTotal / total) * 1000) / 10,
    drugRatio: Math.round((drugTotal / total) * 1000) / 10,
    materialRatio: Math.round((materialTotal / total) * 1000) / 10,
  };
}

/**
 * 财务趋势预测（纯函数）。
 *
 * @param history 历史收入列表
 * @returns 环比/同比/预测
 */
export function predictFinancialTrend(history: number[]): { mom: number; yoy: number; forecast: number } {
  if (history.length < 2) return { mom: 0, yoy: 0, forecast: 0 };
  const recent = history[history.length - 1];
  const previous = history[history.length - 2];
  const mom = Math.round(((recent - previous) / previous) * 1000) / 10;
  const yoy = history.length >= 13 ? Math.round(((recent - history[history.length - 13]) / history[history.length - 13]) * 1000) / 10 : mom;
  const forecast = Math.round(recent * (1 + mom / 100));
  return { mom, yoy, forecast };
}

/** 财务报告输出 */
export interface FinanceBillingReport {
  dept: string;
  timeRange: string;
  revenueStructure: { total: number; outpatientRatio: number; inpatientRatio: number; drugRatio: number; materialRatio: number };
  insuranceSettlement: { pooling: number; personal: number; selfPay: number };
  arrears: { total: number; overdue: number };
  refunds: { count: number; amount: number; rate: number };
  trend: { mom: number; yoy: number; forecast: number };
  suggestions: string[];
}

/**
 * 构建财务收费管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 财务报告
 */
export function buildFinanceBillingReport(dept: string, timeRange: string): FinanceBillingReport {
  const revenueData: RevenueData = {
    outpatient: { registration: 200000, consultation: 500000, exam: 800000, treatment: 400000, drug: 600000, material: 100000 },
    inpatient: { bed: 1500000, nursing: 800000, surgery: 2000000, anesthesia: 600000, drug: 1200000, material: 500000 },
    insurance: { pooling: 3500000, personal: 1500000, selfPay: 800000, selfExpense: 500000, seriousIllness: 200000 },
  };

  const revenueStructure = calculateRevenueStructure(revenueData);
  const trend = predictFinancialTrend([5000000, 5200000, 5100000, 5300000, 5500000, 5400000, 5600000, 5800000, 5700000, 5900000, 6000000, 6100000, 6200000, 6500000]);

  const suggestions: string[] = [];
  if (revenueStructure.drugRatio > 30) {
    suggestions.push('药占比偏高，建议加强处方点评');
  }
  if (revenueStructure.outpatientRatio < 40) {
    suggestions.push('门诊收入占比偏低，建议优化门诊服务');
  }

  return {
    dept,
    timeRange,
    revenueStructure,
    insuranceSettlement: { pooling: 3500000, personal: 1500000, selfPay: 800000 },
    arrears: { total: 300000, overdue: 80000 },
    refunds: { count: 45, amount: 120000, rate: 0.005 },
    trend,
    suggestions,
  };
}
