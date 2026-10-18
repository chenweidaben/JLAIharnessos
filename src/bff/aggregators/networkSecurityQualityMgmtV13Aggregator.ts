/**
 * 健澜科技 jlmedaios - 网络安全质量管理 V13 纯函数（M432-C，-quality 后缀避让旧版 networkSecurityMgmtV13（M409））
 *
 * computeNetworkSecurityIncidentCountV13 / computeNetworkSecurityVulnFixTimelinessRateV13 / computeNetworkSecurityLevelAssessmentPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 网络安全质量管理记录 */
export interface NetworkSecurityQualityMgmtRecordV13 {
  incidentCount: number;
  timelyFixed: number;
  shouldFixVulns: number;
  passedAssessments: number;
  totalAssessments: number;
}

/**
 * 网络安全事件数（纯函数，整数求和类，单位次，反向指标，值越低越好）：对 incidentCount 求和。
 *
 * @param records 网络安全质量管理记录列表
 * @returns 网络安全事件数（整数次）
 */
export function computeNetworkSecurityIncidentCountV13(records: NetworkSecurityQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.incidentCount, 0);
}

/**
 * 漏洞修复及时率（纯函数）：及时修复漏洞数/应修复漏洞总数×100，保留 2 位小数。
 *
 * @param records 网络安全质量管理记录列表
 * @returns 漏洞修复及时率百分比
 */
export function computeNetworkSecurityVulnFixTimelinessRateV13(records: NetworkSecurityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldFixVulns, 0);
  if (total === 0) return 0;
  const fixed = records.reduce((acc, r) => acc + r.timelyFixed, 0);
  return Math.round((fixed / total) * 10000) / 100;
}

/**
 * 等保测评通过率（纯函数）：通过测评次数/测评总次数×100，保留 2 位小数。
 *
 * @param records 网络安全质量管理记录列表
 * @returns 等保测评通过率百分比
 */
export function computeNetworkSecurityLevelAssessmentPassRateV13(records: NetworkSecurityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAssessments, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.passedAssessments, 0);
  return Math.round((passed / total) * 10000) / 100;
}
