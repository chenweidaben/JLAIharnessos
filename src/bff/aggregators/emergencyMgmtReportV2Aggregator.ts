/**
 * 健澜科技 jlmedaios - 急诊管理 V2 纯函数（M225-C）
 *
 * buildEmergencyMgmtReportV2 / triageEmergency / assessGreenChannelTime
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 急诊分诊（纯函数）。
 *
 * @param condition 病情描述
 * @param vitals 生命体征异常数
 * @returns 分诊级别
 */
export function triageEmergency(condition: string, vitals: number): { level: string; area: string } {
  let level = 'IV级';
  let area = '绿区';
  if (condition.includes('心跳骤停') || vitals >= 3) {
    level = 'I级';
    area = '红区';
  } else if (vitals >= 2) {
    level = 'II级';
    area = '黄区';
  } else if (vitals >= 1) {
    level = 'III级';
    area = '黄区';
  }
  return { level, area };
}

/**
 * 评估绿色通道时间（纯函数）。
 *
 * @param door 进门时间（分钟）
 * @param needle 溶栓/手术时间（分钟）
 * @returns 是否达标
 */
export function assessGreenChannelTime(door: number, needle: number): { doorToNeedle: number; onTime: boolean } {
  const doorToNeedle = needle - door;
  return { doorToNeedle, onTime: doorToNeedle <= 60 };
}

/** 急诊管理 V2 报告输出 */
export interface EmergencyMgmtReportV2 {
  timeRange: string;
  triage: { total: number; level1: number; level2: number };
  resuscitation: { cases: number; success: number };
  observation: { cases: number; admitted: number };
  ward: { transferred: number };
  greenChannel: { chest: number; stroke: number; trauma: number };
  infusion: { cases: number };
  complaint: { count: number };
  management: { boardingTime: number };
  suggestions: string[];
}

/**
 * 构建急诊管理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 急诊管理 V2 报告
 */
export function buildEmergencyMgmtReportV2(timeRange: string): EmergencyMgmtReportV2 {
  return {
    timeRange,
    triage: { total: 30000, level1: 500, level2: 3000 },
    resuscitation: { cases: 800, success: 600 },
    observation: { cases: 5000, admitted: 2000 },
    ward: { transferred: 1500 },
    greenChannel: { chest: 800, stroke: 600, trauma: 400 },
    infusion: { cases: 10000 },
    complaint: { count: 30 },
    management: { boardingTime: 8 },
    suggestions: ['缩短滞留时间', '优化绿色通道'],
  };
}
