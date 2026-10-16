/**
 * 健澜科技 jlmedaios - 院感控制 V3 纯函数（M229-D）
 *
 * buildInfectionControlReportV3 / calculateInfectionRate / assessMRSAControl
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算感染率（纯函数）。
 *
 * @param cases 感染例数
 * @param patientDays 住院床日数
 * @returns 感染率（‰）
 */
export function calculateInfectionRate(cases: number, patientDays: number): { rate: number; target: boolean } {
  const rate = patientDays > 0 ? Math.round(cases * 10000 / patientDays) / 10 : 0;
  return { rate, target: rate <= 10 };
}

/**
 * 评估 MRSA 控制效果（纯函数）。
 *
 * @param mdros MDRO 定植/感染数
 * @param isolation 接触隔离数
 * @returns 控制率
 */
export function assessMRSAControl(mdros: number, isolation: number): { rate: number; level: string } {
  const rate = mdros > 0 ? Math.round(isolation * 100 / mdros) : 100;
  let level = '良好';
  if (rate >= 95) level = '优秀';
  else if (rate < 80) level = '一般';
  return { rate, level };
}

/** 院感控制 V3 报告输出 */
export interface InfectionControlReportV3 {
  timeRange: string;
  handHygiene: { compliance: number };
  targeted: { icu: number; nicu: number; hd: number };
  mdro: { mrsa: number; vre: number; cre: number; crab: number };
  antibiotic: { density: number };
  ssi: { rate: number };
  catheter: { clabsi: number; cauti: number; vap: number };
  environment: { sampling: number };
  outbreak: { events: number };
  suggestions: string[];
}

/**
 * 构建院感控制 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 院感控制 V3 报告
 */
export function buildInfectionControlReportV3(timeRange: string): InfectionControlReportV3 {
  return {
    timeRange,
    handHygiene: { compliance: 95 },
    targeted: { icu: 5, nicu: 2, hd: 3 },
    mdro: { mrsa: 10, vre: 5, cre: 3, crab: 4 },
    antibiotic: { density: 40 },
    ssi: { rate: 1.5 },
    catheter: { clabsi: 1.2, cauti: 0.8, vap: 2.0 },
    environment: { sampling: 200 },
    outbreak: { events: 0 },
    suggestions: ['提升手卫生依从性', '加强导管相关感染防控'],
  };
}
