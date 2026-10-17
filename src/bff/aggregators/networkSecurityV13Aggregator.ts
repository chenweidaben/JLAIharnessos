/**
 * 健澜科技 jlmedaios - 网络安全 V13 纯函数（M363-C）
 *
 * computeNetworkAttackBlockedCountV13 / computeHighRiskVulnerabilityFixRateV13 / computeClassifiedProtectionComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 网络安全记录 */
export interface NetworkSecurityRecordV13 {
  attackBlocked: number;
  vulnerabilityFixed: number;
  vulnerabilityFound: number;
  classifiedCompliant: number;
  classifiedRequired: number;
}

/**
 * 网络攻击拦截数（纯函数）：求和。
 *
 * @param records 网络安全记录列表
 * @returns 网络攻击拦截数
 */
export function computeNetworkAttackBlockedCountV13(records: NetworkSecurityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.attackBlocked, 0);
}

/**
 * 高危漏洞修复率（纯函数）：修复数/发现数×100，保留 2 位小数。
 *
 * @param records 网络安全记录列表
 * @returns 高危漏洞修复率百分比
 */
export function computeHighRiskVulnerabilityFixRateV13(records: NetworkSecurityRecordV13[]): number {
  const fixed = records.reduce((acc, r) => acc + r.vulnerabilityFixed, 0);
  const found = records.reduce((acc, r) => acc + r.vulnerabilityFound, 0);
  if (found === 0) return 0;
  return Math.round((fixed / found) * 10000) / 100;
}

/**
 * 等保三级合规率（纯函数）：合规系统数/应测评系统数×100，保留 2 位小数。
 *
 * @param records 网络安全记录列表
 * @returns 等保三级合规率百分比
 */
export function computeClassifiedProtectionComplianceRateV13(records: NetworkSecurityRecordV13[]): number {
  const compliant = records.reduce((acc, r) => acc + r.classifiedCompliant, 0);
  const required = records.reduce((acc, r) => acc + r.classifiedRequired, 0);
  if (required === 0) return 0;
  return Math.round((compliant / required) * 10000) / 100;
}
