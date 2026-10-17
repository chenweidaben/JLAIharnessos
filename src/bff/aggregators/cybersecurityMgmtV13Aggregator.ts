/**
 * 健澜科技 jlmedaios - 网络安全管理 V13 纯函数（M409-C）
 *
 * computeClassifiedProtectionTestPassRateV13 / computeVulnerabilityFixTimelyRateV13 / computeSecurityIncidentResponseTimeV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 网络安全管理记录 */
export interface CybersecurityMgmtRecordV13 {
  passed: number;
  total: number;
  fixed: number;
  vulnTotal: number;
  responseHours: number;
}

/**
 * 等保测评通过率（纯函数）：通过系统数/测评系统总数×100，保留 2 位小数。
 *
 * @param records 网络安全管理记录列表
 * @returns 等保测评通过率百分比
 */
export function computeClassifiedProtectionTestPassRateV13(records: CybersecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.passed, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 漏洞修复及时率（纯函数）：及时修复漏洞数/漏洞总数×100，保留 2 位小数。
 *
 * @param records 网络安全管理记录列表
 * @returns 漏洞修复及时率百分比
 */
export function computeVulnerabilityFixTimelyRateV13(records: CybersecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.vulnTotal, 0);
  if (total === 0) return 0;
  const fixed = records.reduce((acc, r) => acc + r.fixed, 0);
  return Math.round((fixed / total) * 10000) / 100;
}

/**
 * 安全事件响应时长（纯函数）：平均值，单位小时，Math.ceil 向上取整到整小时。
 *
 * @param records 网络安全管理记录列表
 * @returns 安全事件响应时长（整小时）
 */
export function computeSecurityIncidentResponseTimeV13(records: CybersecurityMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.responseHours, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}
