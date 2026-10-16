/**
 * 健澜科技 jlmedaios - 信息化建设纯函数（M213-C）
 *
 * buildInformatizationReport / assessITAvailability / scoreInformatizationMaturity
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估 IT 可用率（纯函数）。
 *
 * @param uptime 可用分钟
 * @param total 总分钟
 * @returns 可用率
 */
export function assessITAvailability(uptime: number, total: number): { rate: number; level: string } {
  const rate = total > 0 ? uptime / total : 0;
  let level = '达标';
  if (rate >= 0.999) level = '优秀';
  else if (rate < 0.99) level = '不达标';
  return { rate, level };
}

/**
 * 评分信息化成熟度（纯函数）。
 *
 * @param capabilities 能力分数（0-100）
 * @returns 总分与等级
 */
export function scoreInformatizationMaturity(capabilities: number[]): { total: number; level: string } {
  const total = capabilities.reduce((a, b) => a + b, 0) / Math.max(capabilities.length, 1);
  let level = '中级';
  if (total >= 85) level = '高级';
  else if (total < 60) level = '初级';
  return { total, level };
}

/** 信息化报告输出 */
export interface InformatizationReport {
  timeRange: string;
  infrastructure: { servers: number; bandwidth: number };
  applications: { his: boolean; emr: boolean; lIS: boolean; pacs: boolean };
  dataCenter: { cdr: number; odr: number; warehouse: boolean };
  security: { mlps3: boolean; firewall: number };
  itOps: { incidents: number; changes: number };
  integration: { esb: boolean };
  mobile: { apps: number };
  plan: { threeYear: boolean };
  suggestions: string[];
}

/**
 * 构建信息化报告。
 *
 * @param timeRange 时间范围
 * @returns 信息化报告
 */
export function buildInformatizationReport(timeRange: string): InformatizationReport {
  return {
    timeRange,
    infrastructure: { servers: 100, bandwidth: 1000 },
    applications: { his: true, emr: true, lIS: true, pacs: true },
    dataCenter: { cdr: 50, odr: 100, warehouse: true },
    security: { mlps3: true, firewall: 10 },
    itOps: { incidents: 50, changes: 200 },
    integration: { esb: true },
    mobile: { apps: 20 },
    plan: { threeYear: true },
    suggestions: ['提高 IT 可用率', '推进数据仓库建设'],
  };
}
