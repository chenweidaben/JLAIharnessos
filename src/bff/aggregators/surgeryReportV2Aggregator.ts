/**
 * 健澜科技 jlmedaios - 手术中心 V2 纯函数（M224-A）
 *
 * buildSurgeryReportV2 / assessSurgerySafety / scheduleOperatingRoom
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估手术安全核查（纯函数）。
 *
 * @param checklist 核查项完成数
 * @param total 总项数
 * @returns 合格率
 */
export function assessSurgerySafety(checklist: number, total: number): { rate: number; pass: boolean } {
  const rate = total > 0 ? Math.round((checklist / total) * 100) : 0;
  return { rate, pass: rate >= 95 };
}

/**
 * 排程手术间（纯函数）。
 *
 * @param surgeries 手术数
 * @param rooms 手术间数
 * @returns 利用率
 */
export function scheduleOperatingRoom(surgeries: number, rooms: number): { utilization: number; perRoom: number } {
  const perRoom = rooms > 0 ? Math.round((surgeries / rooms) * 10) / 10 : 0;
  return { utilization: Math.min(100, Math.round(perRoom * 20)), perRoom };
}

/** 手术中心 V2 报告输出 */
export interface SurgeryReportV2 {
  timeRange: string;
  scheduling: { cases: number; rooms: number };
  preop: { visits: number; assessment: number };
  intraop: { timeout: number; ssi: number };
  postop: { pacu: number; analgesia: number };
  grading: { level1: number; level2: number; level3: number; level4: number };
  safety: { checklist: number };
  daySurgery: { cases: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建手术中心 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 手术中心 V2 报告
 */
export function buildSurgeryReportV2(timeRange: string): SurgeryReportV2 {
  return {
    timeRange,
    scheduling: { cases: 8000, rooms: 20 },
    preop: { visits: 8000, assessment: 7800 },
    intraop: { timeout: 8000, ssi: 40 },
    postop: { pacu: 8000, analgesia: 6000 },
    grading: { level1: 500, level2: 2000, level3: 4000, level4: 1500 },
    safety: { checklist: 7900 },
    daySurgery: { cases: 1000 },
    management: { satisfaction: 94 },
    suggestions: ['提高 Time Out 执行率', '扩大日间手术'],
  };
}
