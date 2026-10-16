/**
 * 健澜科技 jlmedaios - 急诊急救 V4 纯函数（M251-A）
 *
 * buildEmergencyV4Report / triageEmergencyV4 / assessGreenChannelV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 急诊分诊 V4（纯函数）。
 *
 * @param condition 病情
 * @param vitals 生命体征
 * @returns 分诊
 */
export function triageEmergencyV4(condition: string, vitals: { bp: number; hr: number; spo2: number }): { level: number; zone: string; wait: number } {
  let level = 4;
  let zone = "绿区";
  let wait = 120;
  if (vitals.spo2 < 90 || vitals.hr > 120 || condition === "心跳骤停") {
    level = 1;
    zone = "红区";
    wait = 0;
  } else if (vitals.hr > 100 || condition === "胸痛") {
    level = 2;
    zone = "黄区";
    wait = 10;
  }
  return { level, zone, wait };
}

/**
 * 评估绿色通道 V4（纯函数）。
 *
 * @param door 到门时间
 * @param needle 穿刺时间
 * @returns 通道
 */
export function assessGreenChannelV4(door: number, needle: number): { time: number; target: boolean } {
  const time = needle - door;
  return { time, target: time <= 90 };
}

/** 急诊 V4 报告输出 */
export interface EmergencyV4Report {
  timeRange: string;
  triage: { level1: number; level2: number; level3: number; level4: number };
  resuscitation: { success: number; avgTime: number; airway: number };
  greenChannel: { chestPain: number; stroke: number; trauma: number };
  observation: { avgStay: number; safeRate: number };
  disaster: { drill: number; massCasualty: number };
  suggestions: string[];
}

/**
 * 构建急诊 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 急诊 V4 报告
 */
export function buildEmergencyV4Report(timeRange: string): EmergencyV4Report {
  return {
    timeRange,
    triage: { level1: 50, level2: 300, level3: 1000, level4: 2000 },
    resuscitation: { success: 85, avgTime: 15, airway: 200 },
    greenChannel: { chestPain: 100, stroke: 80, trauma: 50 },
    observation: { avgStay: 24, safeRate: 98 },
    disaster: { drill: 4, massCasualty: 2 },
    suggestions: ["缩短 D2B 时间", "提升绿色通道达标率"],
  };
}
