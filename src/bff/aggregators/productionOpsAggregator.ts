/**
 * 健澜科技 jlmedaios - 生产运维监控深化纯函数（M201-D）
 *
 * buildProductionOpsReport / analyzeProductionLog / generateIncidentReview
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 日志条目 */
export interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  service: string;
  timestamp: string;
}

/**
 * 分析生产日志（纯函数）。
 *
 * @param logs 日志列表
 * @returns 分析结果
 */
export function analyzeProductionLog(logs: LogEntry[]): { errors: number; warnings: number; topServices: string[]; health: string } {
  const errors = logs.filter((l) => l.level === 'ERROR' || l.level === 'FATAL').length;
  const warnings = logs.filter((l) => l.level === 'WARN').length;

  const serviceCount: Record<string, number> = {};
  for (const l of logs) {
    if (l.level === 'ERROR' || l.level === 'FATAL') {
      serviceCount[l.service] = (serviceCount[l.service] ?? 0) + 1;
    }
  }
  const topServices = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

  let health = '健康';
  if (errors > 10) health = '严重';
  else if (errors > 3) health = '警告';

  return { errors, warnings, topServices, health };
}

/** 事故数据 */
export interface IncidentData {
  id: string;
  severity: 'P0' | 'P1' | 'P2';
  description: string;
  durationMin: number;
  impact: string;
  rootCause: string;
  resolution: string;
}

/**
 * 生成事故复盘（纯函数）。
 *
 * @param incident 事故
 * @returns 复盘报告
 */
export function generateIncidentReview(incident: IncidentData): { summary: string; actionItems: string[]; lessons: string[] } {
  return {
    summary: `[${incident.severity}] ${incident.description}，持续 ${incident.durationMin} 分钟，影响 ${incident.impact}。根因：${incident.rootCause}。解决：${incident.resolution}。`,
    actionItems: ['增加监控告警', '完善应急预案'],
    lessons: ['加强值班响应', '优化故障自动恢复'],
  };
}

/** 生产运维报告输出 */
export interface ProductionOpsReport {
  timeRange: string;
  monitoring: { services: number; healthy: number; availability: number };
  logging: { dailyLogsGB: number; retainedDays: number };
  alerting: { rules: number; today: number; noiseRate: number };
  incidents: { total: number; p0: number; p1: number; resolved: number };
  changeMgmt: { changes: number; failed: number; rollback: number };
  capacity: { cpuAvg: number; memoryAvg: number; diskAvg: number };
  dr: { drills: number; rtoMinutes: number; rpoMinutes: number };
  automation: { deployJobs: number; inspectionJobs: number };
  suggestions: string[];
}

/**
 * 构建生产运维报告。
 *
 * @param timeRange 时间范围
 * @returns 生产运维报告
 */
export function buildProductionOpsReport(timeRange: string): ProductionOpsReport {
  return {
    timeRange,
    monitoring: { services: 40, healthy: 39, availability: 0.998 },
    logging: { dailyLogsGB: 50, retainedDays: 30 },
    alerting: { rules: 100, today: 5, noiseRate: 0.1 },
    incidents: { total: 8, p0: 0, p1: 2, resolved: 8 },
    changeMgmt: { changes: 20, failed: 1, rollback: 1 },
    capacity: { cpuAvg: 0.45, memoryAvg: 0.6, diskAvg: 0.5 },
    dr: { drills: 2, rtoMinutes: 30, rpoMinutes: 5 },
    automation: { deployJobs: 50, inspectionJobs: 30 },
    suggestions: ['降低告警噪音', '优化容量规划'],
  };
}
