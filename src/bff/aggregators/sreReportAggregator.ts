/**
 * 健澜科技 jlmedaios - SRE 纯函数（M216-D）
 *
 * buildSREReport / calculateErrorBudget / assessAvailability
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算错误预算（纯函数）。
 *
 * @param slo SLO 目标（如 99.9）
 * @param consumed 已消耗（分钟）
 * @returns 剩余预算
 */
export function calculateErrorBudget(slo: number, consumed: number): { remaining: number; exhausted: boolean } {
  const totalMinutes = 43200;
  const totalBudget = totalMinutes * (1 - slo / 100);
  const remaining = Math.max(0, totalBudget - consumed);
  return { remaining, exhausted: remaining <= 0 };
}

/**
 * 评估可用性（纯函数）。
 *
 * @param success 成功请求
 * @param total 总请求
 * @returns 可用性
 */
export function assessAvailability(success: number, total: number): { availability: number; level: string } {
  const availability = total > 0 ? success / total : 1;
  let level = '良好';
  if (availability >= 0.999) level = '优秀';
  else if (availability < 0.99) level = '待改进';
  return { availability, level };
}

/** SRE 报告输出 */
export interface SREReport {
  timeRange: string;
  slo: { availability: number; latency: number };
  monitoring: { alerts: number };
  postmortem: { incidents: number; blameless: boolean };
  capacity: { planned: number };
  disasterRecovery: { activeActive: boolean; rto: number; rpo: number };
  chaos: { experiments: number };
  oncall: { engineers: number };
  culture: { blameless: boolean };
  suggestions: string[];
}

/**
 * 构建 SRE 报告。
 *
 * @param timeRange 时间范围
 * @returns SRE 报告
 */
export function buildSREReport(timeRange: string): SREReport {
  return {
    timeRange,
    slo: { availability: 99.95, latency: 200 },
    monitoring: { alerts: 50 },
    postmortem: { incidents: 5, blameless: true },
    capacity: { planned: 3 },
    disasterRecovery: { activeActive: true, rto: 5, rpo: 0 },
    chaos: { experiments: 10 },
    oncall: { engineers: 10 },
    culture: { blameless: true },
    suggestions: ['减少告警噪音', '增加故障演练'],
  };
}
