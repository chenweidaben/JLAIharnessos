/**
 * 健澜科技 jlmedaios - 网络安全防护管理 V13 纯函数（M446-C，信息化建设与数据安全管理组）
 *
 * computeNetworkSecurityIncidentCountV13 / computeNetworkSecurityVulnFixTimelinessRateV13 / computeNetworkSecurityDengBaoPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 网络安全防护管理记录 */
export interface NetworkSecurityMgmtRecordV13 {
  securityIncident: boolean;
  timelyFixed: number;
  totalVuln: number;
  passed: number;
  totalAssessment: number;
}

/**
 * 网络安全事件数（纯函数，计数指标，反向指标越低越好）：返回 records.filter(r => r.securityIncident).length。
 *
 * @param records 网络安全防护管理记录列表
 * @returns 网络安全事件数（整数）
 */
export function computeNetworkSecurityIncidentCountV13(records: NetworkSecurityMgmtRecordV13[]): number {
  return records.filter((r) => r.securityIncident).length;
}

/**
 * 漏洞修复及时率（纯函数）：及时修复漏洞数/漏洞总数×100，保留 2 位小数。
 *
 * @param records 网络安全防护管理记录列表
 * @returns 漏洞修复及时率百分比
 */
export function computeNetworkSecurityVulnFixTimelinessRateV13(records: NetworkSecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalVuln, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyFixed, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 等保测评通过率（纯函数）：等保测评通过次数/等保测评总次数×100，保留 2 位小数。
 *
 * @param records 网络安全防护管理记录列表
 * @returns 等保测评通过率百分比
 */
export function computeNetworkSecurityDengBaoPassRateV13(records: NetworkSecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAssessment, 0);
  if (total === 0) return 0;
  const passedCount = records.reduce((acc, r) => acc + r.passed, 0);
  return Math.round((passedCount / total) * 10000) / 100;
}
