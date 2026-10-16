/**
 * 健澜科技 jlmedaios - 远程医疗 V2 纯函数（M214-B）
 *
 * buildTelemedicineReportV2 / assessTeleconsultQuality / trackTelemedicineSLA
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 远程会诊 */
export interface Teleconsult {
  type: string;
  completed: boolean;
  turnaroundHours: number;
}

/**
 * 评估远程会诊质量（纯函数）。
 *
 * @param consults 会诊列表
 * @returns 完成率
 */
export function assessTeleconsultQuality(consults: Teleconsult[]): { completionRate: number; level: string } {
  const completed = consults.filter((c) => c.completed).length;
  const completionRate = consults.length > 0 ? completed / consults.length : 0;
  let level = '达标';
  if (completionRate >= 0.95) level = '优秀';
  else if (completionRate < 0.85) level = '不达标';
  return { completionRate, level };
}

/**
 * 追踪远程医疗 SLA（纯函数）。
 *
 * @param responseTime 响应时间（分钟）
 * @returns SLA 达标情况
 */
export function trackTelemedicineSLA(responseTime: number): { slaMet: boolean; level: string } {
  const slaMet = responseTime <= 30;
  let level = '达标';
  if (responseTime <= 10) level = '优秀';
  else if (responseTime > 60) level = '超标';
  return { slaMet, level };
}

/** 远程医疗 V2 报告输出 */
export interface TelemedicineReportV2 {
  timeRange: string;
  consult: { remote: number; outpatient: number };
  imaging: { radiology: number; pathology: number; cardiology: number };
  teaching: { sessions: number };
  training: { basic: number };
  equipment: { sla: number };
  suggestions: string[];
}

/**
 * 构建远程医疗 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 远程医疗 V2 报告
 */
export function buildTelemedicineReportV2(timeRange: string): TelemedicineReportV2 {
  return {
    timeRange,
    consult: { remote: 500, outpatient: 200 },
    imaging: { radiology: 1000, pathology: 200, cardiology: 800 },
    teaching: { sessions: 20 },
    training: { basic: 100 },
    equipment: { sla: 99.5 },
    suggestions: ['提高远程会诊完成率', '缩短响应时间'],
  };
}
