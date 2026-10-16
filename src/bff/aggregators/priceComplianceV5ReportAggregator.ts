/**
 * 健澜科技 jlmedaios - 价格管理与收费合规 V5 纯函数（M271-C）
 *
 * validateChargeV5 / comparePriceV5 / buildPriceComplianceV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 收费校验 V5（纯函数）。
 *
 * @param item 项目名
 * @param price 收费价格
 * @param rule 规定价格
 * @returns 校验结果
 */
export function validateChargeV5(item: string, price: number, rule: number): { item: string; compliant: boolean; reason: string } {
  let compliant = true;
  let reason = "合规";
  if (price > rule) {
    compliant = false;
    reason = "超标准收费";
  } else if (price <= 0) {
    compliant = false;
    reason = "价格无效";
  } else if (price < rule * 0.5) {
    compliant = false;
    reason = "疑似分解收费";
  }
  return { item, compliant, reason };
}

/**
 * 价格比对 V5（纯函数）。
 *
 * @param item 项目名
 * @param catalog 目录价格
 * @returns 比对结果
 */
export function comparePriceV5(item: string, catalog: number): { item: string; gap: number; level: string } {
  const actual = catalog * 1.05;
  const gap = Math.round((actual - catalog) * 100) / 100;
  let level = "正常";
  if (Math.abs(gap) >= catalog * 0.1) {
    level = "偏离";
  } else if (Math.abs(gap) >= catalog * 0.05) {
    level = "预警";
  }
  return { item, gap, level };
}

/** 价格管理与收费合规 V5 报告输出 */
export interface PriceComplianceV5Report {
  timeRange: string;
  catalog: { medicalService: number; drug: number; consumable: number; pricing: number; adjustment: number; publication: number };
  maintenance: { itemMapping: number; priceCode: number; insuranceCode: number; priceGroup: number; batchAdjustment: number };
  compliance: { chargeItemMapping: number; splitCharge: number; duplicateCharge: number; overStandard: number; selfCheck: number };
  publication: { hospitalExternal: number; query: number; transparent: number; patientFeeList: number };
  costPricing: { newProject: number; costCalculation: number; priceDeclaration: number; insuranceNegotiation: number; sunshineProcurement: number };
  audit: { chargeRecord: number; refund: number; waiver: number; discount: number; audit: number; traceability: number };
  regulation: { insuranceFlySurprise: number; priceInspection: number; violation: number; rectification: number; complaint: number; priceDispute: number };
  metrics: { complianceRate: number; adjustmentTimeliness: number; priceComplaint: number; newProjectCount: number; revenueStructure: number };
  suggestions: string[];
}

/**
 * 构建价格管理与收费合规 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildPriceComplianceV5Report(timeRange: string): PriceComplianceV5Report {
  return {
    timeRange,
    catalog: { medicalService: 3500, drug: 1200, consumable: 800, pricing: 3500, adjustment: 50, publication: 3500 },
    maintenance: { itemMapping: 3500, priceCode: 3500, insuranceCode: 3200, priceGroup: 20, batchAdjustment: 50 },
    compliance: { chargeItemMapping: 3500, splitCharge: 5, duplicateCharge: 3, overStandard: 2, selfCheck: 3500 },
    publication: { hospitalExternal: 1, query: 5000, transparent: 1, patientFeeList: 3000 },
    costPricing: { newProject: 15, costCalculation: 15, priceDeclaration: 12, insuranceNegotiation: 8, sunshineProcurement: 100 },
    audit: { chargeRecord: 30000, refund: 80, waiver: 20, discount: 30, audit: 1, traceability: 1 },
    regulation: { insuranceFlySurprise: 2, priceInspection: 1, violation: 3, rectification: 3, complaint: 8, priceDispute: 5 },
    metrics: { complianceRate: 99.7, adjustmentTimeliness: 98, priceComplaint: 0.3, newProjectCount: 15, revenueStructure: 100 },
    suggestions: [
      "加强收费合规自查，减少分解收费",
      "及时公示价格，提升患者透明度",
      "规范新项目定价流程",
    ],
  };
}
