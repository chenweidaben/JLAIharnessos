/**
 * 健澜科技 jlmedaios - 急救体系深化 V2 纯函数（M222-C）
 *
 * buildEmergencyDeepeningV2 / assessEmergencyResponse / triagePatientV2
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估急救反应时间（纯函数）。
 *
 * @param dispatch 调度时间（分钟）
 * @param arrival 到达时间（分钟）
 * @returns 反应等级
 */
export function assessEmergencyResponse(dispatch: number, arrival: number): { level: string; fast: boolean } {
  const total = dispatch + arrival;
  let level = '达标';
  if (total > 15) level = '延迟';
  else if (total <= 10) level = '优秀';
  return { level, fast: total <= 10 };
}

/**
 * 分诊患者（纯函数）。
 *
 * @param condition 病情描述
 * @param vitals 生命体征异常数
 * @returns 分诊等级
 */
export function triagePatientV2(condition: string, vitals: number): { level: string; red: boolean } {
  let level = '四级';
  if (vitals >= 3 || condition.includes('心跳骤停')) level = '一级';
  else if (vitals >= 2 || condition.includes('休克')) level = '二级';
  else if (vitals >= 1) level = '三级';
  return { level, red: level === '一级' };
}

/** 急救体系深化 V2 报告输出 */
export interface EmergencyDeepeningV2 {
  timeRange: string;
  prehospital: { calls: number; avgResponse: number };
  triage: { level1: number; level2: number; level3: number; level4: number };
  critical: { cardiacArrest: number; shock: number; mods: number };
  greenChannel: { stroke: number; chestPain: number; trauma: number };
  surgery: { urgent: number };
  observation: { patients: number };
  disaster: { drills: number };
  training: { cpr: number; bls: number; acls: number };
  suggestions: string[];
}

/**
 * 构建急救体系深化 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 急救体系深化 V2 报告
 */
export function buildEmergencyDeepeningV2(timeRange: string): EmergencyDeepeningV2 {
  return {
    timeRange,
    prehospital: { calls: 5000, avgResponse: 8 },
    triage: { level1: 200, level2: 800, level3: 3000, level4: 2000 },
    critical: { cardiacArrest: 50, shock: 100, mods: 30 },
    greenChannel: { stroke: 200, chestPain: 300, trauma: 150 },
    surgery: { urgent: 500 },
    observation: { patients: 800 },
    disaster: { drills: 4 },
    training: { cpr: 200, bls: 100, acls: 50 },
    suggestions: ['缩短平均反应时间', '加强绿色通道建设'],
  };
}
