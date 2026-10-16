/**
 * 健澜科技 jlmedaios - SRE 深化纯函数（M197-D）
 *
 * buildSREReport / calculateErrorBudget / triageAlert
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** SLO 数据 */
export interface SLOData {
  target: number;
}

/** SLI 数据 */
export interface SLIData {
  availability: number;
}

/**
 * 计算错误预算（纯函数）。
 *
 * @param slo SLO
 * @param sli SLI
 * @returns 错误预算
 */
export function calculateErrorBudget(slo: SLOData, sli: SLIData): { total: number; consumed: number; remaining: number; burnRate: number } {
  const total = 1 - slo.target;
  const consumed = Math.max(0, 1 - sli.availability);
  const remaining = Math.max(0, total - consumed);
  const burnRate = total > 0 ? consumed / total : 0;
  return { total, consumed, remaining, burnRate };
}

/** 告警数据 */
export interface AlertData {
  severity: 'critical' | 'warning' | 'info';
  affectedServices: number;
  durationMinutes: number;
}

/**
 * 告警分级分诊（纯函数）。
 *
 * @param alert 告警
 * @returns 分诊结果
 */
export function triageAlert(alert: AlertData): { priority: 'P0' | 'P1' | 'P2' | 'P3'; onCall: string; action: string } {
  if (alert.severity === 'critical' && alert.affectedServices > 5) {
    return { priority: 'P0', onCall: 'SRE 值班 + 业务负责人', action: '立即响应，15 分钟内恢复' };
  }
  if (alert.severity === 'critical') {
    return { priority: 'P1', onCall: 'SRE 值班', action: '30 分钟内响应' };
  }
  if (alert.severity === 'warning') {
    return { priority: 'P2', onCall: '开发值班', action: '2 小时内处理' };
  }
  return { priority: 'P3', onCall: '团队跟进', action: '24 小时内排查' };
}

/** SRE 报告输出 */
export interface SREReport {
  timeRange: string;
  slo: { availability: number; latency: number; correctness: number };
  sli: { availability: number; latencyMs: number; throughput: number; errorRate: number };
  errorBudget: { total: number; consumed: number; remaining: number; burnRate: number };
  alerting: { rules: number; critical: number; warning: number; noise: number };
  incidents: { total: number; p0: number; p1: number; postmortems: number; knowledgeBase: number };
  capacity: { currentUtilization: number; projectedGrowth: number };
  dr: { drills: number; rto: number; rpo: number };
  culture: { blamelessPostmortem: boolean; training: number };
  suggestions: string[];
}

/**
 * 构建 SRE 报告。
 *
 * @param timeRange 时间范围
 * @returns SRE 报告
 */
export function buildSREReport(timeRange: string): SREReport {
  const errorBudget = calculateErrorBudget({ target: 0.999 }, { availability: 0.9985 });

  return {
    timeRange,
    slo: { availability: 0.999, latency: 0.95, correctness: 0.995 },
    sli: { availability: 0.9985, latencyMs: 150, throughput: 5000, errorRate: 0.0015 },
    errorBudget,
    alerting: { rules: 50, critical: 10, warning: 25, noise: 5 },
    incidents: { total: 20, p0: 2, p1: 8, postmortems: 15, knowledgeBase: 100 },
    capacity: { currentUtilization: 0.65, projectedGrowth: 0.2 },
    dr: { drills: 2, rto: 60, rpo: 15 },
    culture: { blamelessPostmortem: true, training: 10 },
    suggestions: ['降低告警噪音', '增加灾备演练频率'],
  };
}
