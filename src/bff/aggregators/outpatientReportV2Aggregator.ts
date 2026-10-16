/**
 * 健澜科技 jlmedaios - 门诊管理 V2 纯函数（M225-A）
 *
 * buildOutpatientReportV2 / assessOutpatientEfficiency / calculateNoShowRate
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估门诊效率（纯函数）。
 *
 * @param visits 日门诊量
 * @param time 平均候诊时间（分钟）
 * @returns 效率评级
 */
export function assessOutpatientEfficiency(visits: number, time: number): { level: string; efficient: boolean } {
  let level = '良好';
  if (time > 40) level = '待改进';
  else if (time <= 20) level = '优秀';
  return { level, efficient: time <= 30 };
}

/**
 * 计算爽约率（纯函数）。
 *
 * @param appointments 预约数
 * @param noShows 爽约数
 * @returns 爽约率
 */
export function calculateNoShowRate(appointments: number, noShows: number): { rate: number; pct: string } {
  const rate = appointments > 0 ? Math.round((noShows / appointments) * 1000) / 10 : 0;
  return { rate, pct: `${rate}%` };
}

/** 门诊管理 V2 报告输出 */
export interface OutpatientReportV2 {
  timeRange: string;
  appointment: { scheduled: number; noShow: number };
  triage: { visits: number; expert: number };
  consultation: { avgWait: number; pointSettlement: number };
  prescription: { reviewed: number; qualified: number };
  inspection: { completed: number };
  complaint: { count: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建门诊管理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 门诊管理 V2 报告
 */
export function buildOutpatientReportV2(timeRange: string): OutpatientReportV2 {
  return {
    timeRange,
    appointment: { scheduled: 60000, noShow: 3000 },
    triage: { visits: 50000, expert: 15000 },
    consultation: { avgWait: 22, pointSettlement: 45000 },
    prescription: { reviewed: 20000, qualified: 19000 },
    inspection: { completed: 30000 },
    complaint: { count: 50 },
    management: { satisfaction: 92 },
    suggestions: ['降低爽约率', '缩短候诊时间'],
  };
}
