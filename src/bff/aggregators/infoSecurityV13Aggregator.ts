/**
 * 健澜科技 jlmedaios - 信息安全 V13 纯函数（M353-A）
 *
 * computeVulnerabilityPatchRateV13 / computeMLPS3ComplianceRateV13 / computeAnnualDrillCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 信息安全记录 */
export interface InfoSecurityRecordV13 {
  vulnerabilityFixedOnTime: number;
  vulnerabilityHighCount: number;
  mlps3CompliantItems: number;
  mlps3TotalItems: number;
  annualDrillCount: number;
}

/**
 * 高危漏洞修复及时率（纯函数）：及时修复数/高危漏洞数×100，保留 2 位小数。
 *
 * @param records 信息安全记录列表
 * @returns 高危漏洞修复及时率百分比
 */
export function computeVulnerabilityPatchRateV13(records: InfoSecurityRecordV13[]): number {
  const fixed = records.reduce((acc, r) => acc + r.vulnerabilityFixedOnTime, 0);
  const high = records.reduce((acc, r) => acc + r.vulnerabilityHighCount, 0);
  if (high === 0) return 0;
  return Math.round((fixed / high) * 10000) / 100;
}

/**
 * 等保三级合规率（纯函数）：合规项数/总测评项数×100，保留 2 位小数。
 *
 * @param records 信息安全记录列表
 * @returns 等保三级合规率百分比
 */
export function computeMLPS3ComplianceRateV13(records: InfoSecurityRecordV13[]): number {
  const compliant = records.reduce((acc, r) => acc + r.mlps3CompliantItems, 0);
  const total = records.reduce((acc, r) => acc + r.mlps3TotalItems, 0);
  if (total === 0) return 0;
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 年度安全演练次数（纯函数）：求和。
 *
 * @param records 信息安全记录列表
 * @returns 年度安全演练次数
 */
export function computeAnnualDrillCountV13(records: InfoSecurityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.annualDrillCount, 0);
}
