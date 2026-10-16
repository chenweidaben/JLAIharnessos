/**
 * 健澜科技 jlmedaios - 传染病防控 V2 纯函数（M221-A）
 *
 * buildInfectiousDiseaseReportV2 / assessReportTimeliness / detectOutbreak
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估报告及时率（纯函数）。
 *
 * @param reports 总报告数
 * @param deadline 及时报告数
 * @returns 及时率
 */
export function assessReportTimeliness(reports: number, deadline: number): { rate: number; compliant: boolean } {
  const rate = reports > 0 ? Math.round((deadline / reports) * 100) : 0;
  return { rate, compliant: rate >= 95 };
}

/**
 * 检测暴发（纯函数）。
 *
 * @param cases 当前病例数
 * @param threshold 阈值
 * @returns 是否暴发
 */
export function detectOutbreak(cases: number, threshold: number): { outbreak: boolean; level: string } {
  let level = '无';
  if (cases >= threshold * 2) level = '暴发';
  else if (cases >= threshold) level = '预警';
  return { outbreak: cases >= threshold * 2, level };
}

/** 传染病防控 V2 报告输出 */
export interface InfectiousDiseaseReportV2 {
  timeRange: string;
  reporting: { total: number; timely: number };
  feverClinic: { visits: number; zones: number };
  outbreak: { detected: number };
  vaccine: { coldChain: boolean; doses: number };
  tb: { dots: number };
  hiv: { prevention: number };
  emerging: { monitoring: number };
  management: { drills: number };
  suggestions: string[];
}

/**
 * 构建传染病防控 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 传染病防控 V2 报告
 */
export function buildInfectiousDiseaseReportV2(timeRange: string): InfectiousDiseaseReportV2 {
  return {
    timeRange,
    reporting: { total: 500, timely: 490 },
    feverClinic: { visits: 10000, zones: 3 },
    outbreak: { detected: 2 },
    vaccine: { coldChain: true, doses: 50000 },
    tb: { dots: 50 },
    hiv: { prevention: 20 },
    emerging: { monitoring: 5 },
    management: { drills: 4 },
    suggestions: ['提高报告及时率', '加强新发传染病监测'],
  };
}
