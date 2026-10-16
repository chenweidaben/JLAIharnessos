/**
 * 健澜科技 jlmedaios - 患者安全深化 V2 纯函数（M209-A）
 *
 * buildPatientSafetyReportV2 / classifyAdverseEventLevel / conductRCA
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 不良事件 */
export interface AdverseEvent {
  severity: number;
  death: boolean;
}

/**
 * 不良事件分级（纯函数）。
 *
 * @param event 事件
 * @returns I-IV 级
 */
export function classifyAdverseEventLevel(event: AdverseEvent): { level: string; code: number } {
  if (event.death || event.severity >= 10) return { level: 'I级（警告事件）', code: 1 };
  if (event.severity >= 7) return { level: 'II级（不良后果事件）', code: 2 };
  if (event.severity >= 3) return { level: 'III级（未造成后果事件）', code: 3 };
  return { level: 'IV级（隐患事件）', code: 4 };
}

/** RCA 分析 */
export interface RCAEvent {
  category: string;
}

/**
 * 根因分析（纯函数）。
 *
 * @param events 事件列表
 * @returns 主要根因
 */
export function conductRCA(events: RCAEvent[]): { topCause: string; frequency: number } {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  let topCause = '未知';
  let frequency = 0;
  for (const [cause, count] of counts) {
    if (count > frequency) {
      topCause = cause;
      frequency = count;
    }
  }
  return { topCause, frequency };
}

/** 患者安全 V2 报告输出 */
export interface PatientSafetyReportV2 {
  timeRange: string;
  events: { levelI: number; levelII: number; levelIII: number; levelIV: number; nearMiss: number };
  rca: { completed: number };
  identity: { pdaScanRate: number };
  medication: { highAlert: number; lookAlikeSoundAlike: number };
  surgery: { timeOutCompliance: number };
  infection: { healthcareAssociated: number };
  culture: { justCulture: boolean; safetyMonth: number };
  suggestions: string[];
}

/**
 * 构建患者安全 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者安全 V2 报告
 */
export function buildPatientSafetyReportV2(timeRange: string): PatientSafetyReportV2 {
  return {
    timeRange,
    events: { levelI: 1, levelII: 10, levelIII: 50, levelIV: 200, nearMiss: 500 },
    rca: { completed: 10 },
    identity: { pdaScanRate: 0.99 },
    medication: { highAlert: 100, lookAlikeSoundAlike: 50 },
    surgery: { timeOutCompliance: 0.98 },
    infection: { healthcareAssociated: 20 },
    culture: { justCulture: true, safetyMonth: 1 },
    suggestions: ['提高 IV 级事件上报率', '加强高警示药品管理'],
  };
}
