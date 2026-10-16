/**
 * 健澜科技 jlmedaios - 公立医院绩效考核纯函数（M210-D）
 *
 * buildHospitalKPIReport / calculateHospitalKPI / assessCMI
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 国考四维度得分 */
export interface HospitalKPIScores {
  quality: number;
  efficiency: number;
  development: number;
  satisfaction: number;
}

/**
 * 计算国考总分（纯函数）。
 *
 * @param s 四维度得分（各 100）
 * @returns 总分与等级
 */
export function calculateHospitalKPI(s: HospitalKPIScores): { total: number; level: string } {
  const total = s.quality * 0.3 + s.efficiency * 0.3 + s.development * 0.2 + s.satisfaction * 0.2;
  let level = 'B';
  if (total >= 90) level = 'A+';
  else if (total >= 80) level = 'A';
  else if (total >= 70) level = 'B+';
  return { total, level };
}

/**
 * 评估 CMI（纯函数）。
 *
 * @param cmi 实际 CMI
 * @param expected 期望 CMI
 * @returns 是否达标
 */
export function assessCMI(cmi: number, expected: number): { met: boolean; ratio: number } {
  const ratio = expected > 0 ? cmi / expected : 0;
  return { met: ratio >= 1, ratio };
}

/** 国考报告输出 */
export interface HospitalKPIReport {
  timeRange: string;
  quality: { level34Surgery: number; cmi: number; lowRiskMortality: number };
  efficiency: { time: number; resource: number };
  development: { talent: number; discipline: number; research: number };
  satisfaction: { patient: number; employee: number };
  indicators: { total: number };
  suggestions: string[];
}

/**
 * 构建国考报告。
 *
 * @param timeRange 时间范围
 * @returns 国考报告
 */
export function buildHospitalKPIReport(timeRange: string): HospitalKPIReport {
  return {
    timeRange,
    quality: { level34Surgery: 0.6, cmi: 1.2, lowRiskMortality: 0.001 },
    efficiency: { time: 0.9, resource: 0.85 },
    development: { talent: 0.8, discipline: 0.75, research: 0.7 },
    satisfaction: { patient: 0.9, employee: 0.85 },
    indicators: { total: 55 },
    suggestions: ['提高三四级手术占比', '提升 CMI'],
  };
}
