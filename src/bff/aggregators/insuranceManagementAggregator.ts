/**
 * 健澜科技 jlmedaios - 医保管理深化纯函数（M192-B）
 *
 * buildInsuranceManagementReport / detectInsuranceViolation / calculateInsuranceSettlement
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 医保记录 */
export interface InsuranceRecord {
  totalCost: number;
  insuranceType: 'employee' | 'resident' | 'seriousIllness' | 'assistance';
  itemCount: number;
  averageCost: number;
  isFakeHospitalization: boolean;
  isUpcoding: boolean;
}

/**
 * 医保违规检测（纯函数）。
 *
 * @param record 医保记录
 * @returns 是否违规及类型
 */
export function detectInsuranceViolation(record: InsuranceRecord): { hasViolation: boolean; types: string[] } {
  const types: string[] = [];
  if (record.isFakeHospitalization) types.push('虚假住院');
  if (record.isUpcoding) types.push('高套分值');
  if (record.itemCount / record.totalCost < 0.001) types.push('分解收费嫌疑');
  if (record.averageCost > 20000) types.push('次均费用超标');
  return { hasViolation: types.length > 0, types };
}

/**
 * 医保结算计算（纯函数）。
 *
 * @param record 医保记录
 * @returns 统筹/个账/自付/自费
 */
export function calculateInsuranceSettlement(record: InsuranceRecord): { pooling: number; personal: number; selfPay: number; selfExpense: number } {
  const poolingRatio = record.insuranceType === 'employee' ? 0.7 : 0.5;
  const selfExpense = Math.round(record.totalCost * 0.1);
  const remaining = record.totalCost - selfExpense;
  const pooling = Math.round(remaining * poolingRatio);
  const personal = Math.round(remaining * 0.15);
  const selfPay = remaining - pooling - personal;
  return { pooling, personal, selfPay, selfExpense };
}

/** 医保报告输出 */
export interface InsuranceManagementReport {
  dept: string;
  timeRange: string;
  policies: { employee: number; resident: number; seriousIllness: number; assistance: number };
  catalog: { drugs: number; treatments: number; services: number };
  audit: { preAuditPassRate: number; duringAuditPassRate: number; postAuditPassRate: number };
  settlement: { monthly: number; yearly: number; crossRegion: number };
  kpi: { averageCost: number; drugRatio: number; materialRatio: number; selfPayRatio: number };
  violations: { count: number; rate: number };
  drgConfig: { enabled: boolean; groups: number };
  suggestions: string[];
}

/**
 * 构建医保管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 医保报告
 */
export function buildInsuranceManagementReport(dept: string, timeRange: string): InsuranceManagementReport {
  return {
    dept,
    timeRange,
    policies: { employee: 15000, resident: 8000, seriousIllness: 500, assistance: 200 },
    catalog: { drugs: 2500, treatments: 1800, services: 300 },
    audit: { preAuditPassRate: 0.95, duringAuditPassRate: 0.92, postAuditPassRate: 0.9 },
    settlement: { monthly: 8500000, yearly: 102000000, crossRegion: 1200000 },
    kpi: { averageCost: 12000, drugRatio: 0.28, materialRatio: 0.15, selfPayRatio: 0.22 },
    violations: { count: 12, rate: 0.003 },
    drgConfig: { enabled: true, groups: 650 },
    suggestions: ['建议加强事前审核，降低违规率', '建议优化 DRG 入组准确率'],
  };
}
