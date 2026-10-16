/**
 * 健澜科技 jlmedaios - 医院感染控制深化 V2 纯函数（M209-B）
 *
 * buildInfectionControlReportV2 / calculateInfectionRate / assessMDROControl
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算感染率（纯函数）。
 *
 * @param cases 感染例数
 * @param patientDays 住院床日
 * @returns 感染率（‰）
 */
export function calculateInfectionRate(cases: number, patientDays: number): { rate: number; level: string } {
  const rate = patientDays > 0 ? (cases / patientDays) * 1000 : 0;
  let level = '达标';
  if (rate > 5) level = '超标';
  else if (rate > 3) level = '偏高';
  return { rate, level };
}

/** MDRO 分离株 */
export interface MDROIsolates {
  mrsa: number;
  vre: number;
  cre: number;
  crab: number;
  cdiff: number;
}

/**
 * 评估 MDRO 控制（纯函数）。
 *
 * @param isolates 分离株
 * @returns 控制等级
 */
export function assessMDROControl(isolates: MDROIsolates): { total: number; control: string } {
  const total = isolates.mrsa + isolates.vre + isolates.cre + isolates.crab + isolates.cdiff;
  let control = '良好';
  if (total >= 100) control = '预警';
  else if (total >= 50) control = '关注';
  return { total, control };
}

/** 院感 V2 报告输出 */
export interface InfectionControlReportV2 {
  timeRange: string;
  surveillance: { overall: number; target: number; outbreak: number };
  target: { ssi: number; vap: number; clabsi: number; cauti: number };
  mdro: MDROIsolates;
  environmental: { handHygiene: number; surface: number };
  ams: { ddd: number; audit: number };
  suggestions: string[];
}

/**
 * 构建院感 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 院感 V2 报告
 */
export function buildInfectionControlReportV2(timeRange: string): InfectionControlReportV2 {
  return {
    timeRange,
    surveillance: { overall: 50, target: 20, outbreak: 0 },
    target: { ssi: 10, vap: 5, clabsi: 3, cauti: 8 },
    mdro: { mrsa: 20, vre: 10, cre: 15, crab: 25, cdiff: 5 },
    environmental: { handHygiene: 0.9, surface: 0.95 },
    ams: { ddd: 35, audit: 100 },
    suggestions: ['提高手卫生依从性', '加强 MDRO 监测'],
  };
}
