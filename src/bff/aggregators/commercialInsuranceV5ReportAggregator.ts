/**
 * 健澜科技 jlmedaios - 商业健康保险与惠民保 V5 纯函数（M262-D）
 *
 * buildCommercialInsuranceV5Report / settleCommercialClaimV5 / designInsuranceProductV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 结算商保理赔 V5（纯函数）。
 *
 * @param bill 账单
 * @param policy 保单
 * @returns 结算
 */
export function settleCommercialClaimV5(bill: { total: number; covered: number }, policy: { deductible: number; ratio: number }): { payable: number; patientPay: number; direct: boolean } {
  const aboveDeductible = Math.max(0, bill.total - policy.deductible);
  const payable = Math.round(aboveDeductible * policy.ratio * 100) / 100;
  const patientPay = Math.round((bill.total - payable) * 100) / 100;
  return { payable, patientPay, direct: true };
}

/**
 * 设计保险产品 V5（纯函数）。
 *
 * @param population 人群
 * @param benefits 保障
 * @returns 产品
 */
export function designInsuranceProductV5(population: { age: number; chronic: boolean }, benefits: { coverage: string; premium: number }): { name: string; target: string; premium: number } {
  let name = "百万医疗";
  let target = "大众人群";
  if (population.age >= 60) {
    name = "惠民保";
    target = "老年/慢病";
  } else if (population.chronic) {
    name = "慢病险";
    target = "慢病患者";
  }
  return { name, target, premium: benefits.premium };
}

/** 商业健康保险与惠民保 V5 报告输出 */
export interface CommercialInsuranceV5Report {
  timeRange: string;
  commercial: { directBilling: number; claim: number; eInvoice: number; realtime: number };
  huimin: { city: number; insured: number; claim: number; deductible: number; specialDrug: number; healthMgmt: number };
  product: { million: number; critical: number; chronic: number; dental: number; checkup: number; premium: number };
  dataService: { insured: number; healthData: number; risk: number; actuarial: number; antiFraud: number };
  window: { commercial: number; claimAssist: number; recordCopy: number; directPoint: number };
  insuranceChain: { basic: number; catastrophic: number; medicalAid: number; commercial: number; selfPay: number };
  plusMgmt: { insurancePlus: number; healthMgmt: number; intervention: number; costControl: number; renewal: number; valueCare: number };
  metrics: { commercialRevenue: number; directVolume: number; claimTAT: number; satisfaction: number; costControl: number };
  suggestions: string[];
}

/**
 * 构建商业健康保险与惠民保 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 商业健康保险与惠民保 V5 报告
 */
export function buildCommercialInsuranceV5Report(timeRange: string): CommercialInsuranceV5Report {
  return {
    timeRange,
    commercial: { directBilling: 5000, claim: 8000, eInvoice: 100, realtime: 95 },
    huimin: { city: 1, insured: 100000, claim: 5000, deductible: 20000, specialDrug: 100, healthMgmt: 30 },
    product: { million: 50000, critical: 5000, chronic: 10000, dental: 2000, checkup: 3000, premium: 1000 },
    dataService: { insured: 100000, healthData: 80, risk: 90, actuarial: 85, antiFraud: 95 },
    window: { commercial: 1, claimAssist: 5000, recordCopy: 10000, directPoint: 20 },
    insuranceChain: { basic: 100, catastrophic: 90, medicalAid: 50, commercial: 10, selfPay: 5 },
    plusMgmt: { insurancePlus: 30, healthMgmt: 20, intervention: 15, costControl: 10, renewal: 70, valueCare: 60 },
    metrics: { commercialRevenue: 500, directVolume: 5000, claimTAT: 3, satisfaction: 85, costControl: 10 },
    suggestions: ["扩大直付范围", "加强健康管理"],
  };
}
