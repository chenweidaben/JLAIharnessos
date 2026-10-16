/**
 * 健澜科技 jlmedaios - 急诊科深化 V3 纯函数（M204-A）
 *
 * buildEmergencyReportV3 / classifyEmergencyLevel / assessGreenChannelTime
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 分诊数据 */
export interface TriageDataV3 {
  systolicBp: number;
  heartRate: number;
  respiration: number;
  consciousness: number;
}

/**
 * 急诊分级（纯函数）。
 *
 * @param triage 分诊数据
 * @returns 分级
 */
export function classifyEmergencyLevel(triage: TriageDataV3): { level: string; waitTimeMin: number } {
  if (triage.systolicBp < 90 || triage.consciousness < 9) {
    return { level: 'I 级（濒危）', waitTimeMin: 0 };
  }
  if (triage.heartRate > 120 || triage.respiration > 30 || triage.systolicBp > 180) {
    return { level: 'II 级（危重）', waitTimeMin: 10 };
  }
  if (triage.consciousness < 13) {
    return { level: 'III 级（急症）', waitTimeMin: 30 };
  }
  return { level: 'IV 级（非急症）', waitTimeMin: 120 };
}

/** 绿色通道时间窗 */
export interface GreenChannelWindowV3 {
  doorToBalloonMin: number;
  doorToNeedleMin: number;
  traumaRescueMin: number;
}

/**
 * 评估绿色通道时效（纯函数）。
 *
 * @param window 时间窗数据
 * @returns 时效评估
 */
export function assessGreenChannelTime(window: GreenChannelWindowV3): { compliant: boolean; breaches: string[] } {
  const breaches: string[] = [];
  if (window.doorToBalloonMin > 90) breaches.push('D-to-B > 90min');
  if (window.doorToNeedleMin > 60) breaches.push('D-to-N > 60min');
  if (window.traumaRescueMin > 60) breaches.push('创伤复苏 > 60min');
  return { compliant: breaches.length === 0, breaches };
}

/** 急诊 V3 报告输出 */
export interface EmergencyReportV3 {
  timeRange: string;
  triage: { total: number; levelI: number; levelII: number; avgWaitMin: number; accuracy: number };
  resuscitation: { successRate: number; goldenHour: number };
  observation: { beds: number; avgStayHours: number; admissionRate: number };
  greenChannel: { chestPain: number; stroke: number; trauma: number; maternal: number };
  quality: { unplannedReturn: number; patientSatisfaction: number };
  suggestions: string[];
}

/**
 * 构建急诊 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 急诊 V3 报告
 */
export function buildEmergencyReportV3(timeRange: string): EmergencyReportV3 {
  return {
    timeRange,
    triage: { total: 10000, levelI: 200, levelII: 800, avgWaitMin: 15, accuracy: 0.95 },
    resuscitation: { successRate: 0.85, goldenHour: 95 },
    observation: { beds: 100, avgStayHours: 24, admissionRate: 0.4 },
    greenChannel: { chestPain: 300, stroke: 200, trauma: 150, maternal: 50 },
    quality: { unplannedReturn: 0.02, patientSatisfaction: 0.9 },
    suggestions: ['缩短急诊滞留时间', '提高胸痛中心 D-to-B 达标率'],
  };
}
