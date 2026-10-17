/**
 * 健澜科技 jlmedaios - 医保智能监管与 DRG/DIP 上报 V5 纯函数（M278-B）
 *
 * buildDRGReportV5 / detectInsuranceRiskV5 / reconcileSettlementV5 / buildInsuranceReportV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 理赔单 */
export interface InsuranceClaim {
  settlementId: string;
  diagnosis: string;
  procedures: string[];
  totalCost: number;
  insurancePay: number;
  patientPay: number;
  lengthOfStay: number;
  expectedCost?: number;
}

/** DRG 上报结果 */
export interface DRGReport {
  settlementId: string;
  drgGroup: string;
  dipPoint: number;
  expectedCost: number;
  costDeviationPct: number;
  riskFlags: string[];
}

/**
 * 生成 DRG/DIP 上报 V5（纯函数）：按诊断分组并算费用偏差。
 *
 * @param claim 理赔单
 * @returns 上报结果
 */
export function buildDRGReportV5(claim: InsuranceClaim): DRGReport {
  let drgGroup = "GRP-普通";
  let expectedCost = 8000;
  if (claim.diagnosis === "急性心梗") {
    drgGroup = "GRP-CI-01";
    expectedCost = 25000;
  } else if (claim.diagnosis === "肺炎") {
    drgGroup = "GRP-RES-02";
    expectedCost = 6000;
  }
  const dipPoint = Math.round(expectedCost / 100);
  const costDeviationPct = expectedCost > 0
    ? Math.round(((claim.totalCost - expectedCost) / expectedCost) * 1000) / 10
    : 0;
  return {
    settlementId: claim.settlementId,
    drgGroup,
    dipPoint,
    expectedCost,
    costDeviationPct,
    riskFlags: [],
  };
}

/**
 * 智能监管疑点检测 V5（纯函数）。
 *
 * @param claim 理赔单
 * @returns 疑点列表
 */
export function detectInsuranceRiskV5(claim: InsuranceClaim): { flags: string[]; riskLevel: "low" | "medium" | "high" } {
  const flags: string[] = [];
  const expected = claim.expectedCost ?? 8000;
  if (claim.totalCost > expected * 1.5 || claim.totalCost > 30000) {
    flags.push("费用异常偏高");
  }
  if (claim.lengthOfStay > 30) flags.push("住院日超长");
  if (claim.procedures.length > 10) flags.push("项目数量异常");
  let riskLevel: "low" | "medium" | "high" = "low";
  if (flags.length >= 2) riskLevel = "high";
  else if (flags.length === 1) riskLevel = "medium";
  return { flags, riskLevel };
}

/**
 * 理赔对账 V5（纯函数）：医保+患者支付应等于总费用。
 *
 * @param claim 理赔单
 * @returns 对账结果
 */
export function reconcileSettlementV5(claim: InsuranceClaim): { balanced: boolean; difference: number } {
  const sum = claim.insurancePay + claim.patientPay;
  const difference = claim.totalCost - sum;
  return { balanced: difference === 0, difference };
}

/** 医保上报看板输出 */
export interface InsuranceReportV5Report {
  totalClaims: number;
  highRiskCount: number;
  avgDeviationPct: number;
  balancedCount: number;
  suggestions: string[];
}

/**
 * 构建医保上报看板（纯函数）。
 *
 * @param claims 理赔单
 * @returns 看板
 */
export function buildInsuranceReportV5Report(claims: InsuranceClaim[]): InsuranceReportV5Report {
  let highRiskCount = 0;
  let deviationSum = 0;
  let balancedCount = 0;
  for (const c of claims) {
    const risk = detectInsuranceRiskV5({ ...c, expectedCost: buildDRGReportV5(c).expectedCost });
    if (risk.riskLevel === "high") highRiskCount += 1;
    deviationSum += buildDRGReportV5(c).costDeviationPct;
    if (reconcileSettlementV5(c).balanced) balancedCount += 1;
  }
  const avgDeviationPct = claims.length > 0 ? Math.round((deviationSum / claims.length) * 10) / 10 : 0;
  return {
    totalClaims: claims.length,
    highRiskCount,
    avgDeviationPct,
    balancedCount,
    suggestions: highRiskCount > 0
      ? ["存在高风险理赔单，需智能监管复核与申诉"]
      : ["医保费用合理，按DRG/DIP正常上报"],
  };
}
