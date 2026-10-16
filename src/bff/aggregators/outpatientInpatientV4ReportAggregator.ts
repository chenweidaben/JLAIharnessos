/**
 * 健澜科技 jlmedaios - 门诊住院 V4 纯函数（M252-D）
 *
 * buildOutpatientInpatientV4Report / assessOutpatientEfficiencyV4 / assessBedUtilizationV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估门诊效率 V4（纯函数）。
 *
 * @param visits 就诊量
 * @param time 时长
 * @returns 效率
 */
export function assessOutpatientEfficiencyV4(visits: number, time: number): { visits: number; avgTime: number; adequate: boolean } {
  const avgTime = Math.round((time / Math.max(visits, 1)) * 10) / 10;
  return { visits, avgTime, adequate: avgTime <= 15 };
}

/**
 * 评估床位利用率 V4（纯函数）。
 *
 * @param beds 床位
 * @param occupied 占用
 * @returns 利用率
 */
export function assessBedUtilizationV4(beds: number, occupied: number): { rate: number; adequate: boolean; alert: boolean } {
  const rate = Math.round((occupied / Math.max(beds, 1)) * 1000) / 10;
  return { rate, adequate: rate >= 85 && rate <= 93, alert: rate > 95 };
}

/** 门诊住院 V4 报告输出 */
export interface OutpatientInpatientV4Report {
  timeRange: string;
  outpatient: { appointment: number; noShow: number; channels: number; smart: number };
  triage: { general: number; specialist: number; disease: number; smart: number };
  visit: { wait: number; consult: number; billing: number; preIntake: number };
  admission: { registration: number; assessment: number; bedAllocation: number; slip: number };
  bed: { utilization: number; turnover: number; avgStay: number; overflow: number };
  treatment: { progress: number; rounds: number; consult: number; pathway: number };
  discharge: { guidance: number; summary: number; followup: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建门诊住院 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 门诊住院 V4 报告
 */
export function buildOutpatientInpatientV4Report(timeRange: string): OutpatientInpatientV4Report {
  return {
    timeRange,
    outpatient: { appointment: 80, noShow: 10, channels: 5, smart: 90 },
    triage: { general: 3000, specialist: 2000, disease: 500, smart: 85 },
    visit: { wait: 20, consult: 10, billing: 5, preIntake: 3000 },
    admission: { registration: 1000, assessment: 950, bedAllocation: 900, slip: 1000 },
    bed: { utilization: 90, turnover: 30, avgStay: 8, overflow: 20 },
    treatment: { progress: 95, rounds: 100, consult: 200, pathway: 600 },
    discharge: { guidance: 950, summary: 950, followup: 800, satisfaction: 92 },
    suggestions: ["缩短候诊时间", "提升床位周转率"],
  };
}
