/**
 * 健澜科技 jlmedaios - 病历质控年度总结报告 V14 聚合器（M471-D，M471 收官）
 *
 * 纯函数：生成年度报告 + 年度趋势汇总。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 年度报告输入 */
export interface AnnualReportInputV14 {
  totalRecords: number;
  avgScore: number;
  defectCount: number;
}

/** 年度报告 */
export interface AnnualReportV14 {
  year: number;
  totalRecords: number;
  avgScore: number;
  defectCount: number;
  passRate: number;
}

/** 年度趋势汇总 */
export interface YearlyTrendV14 {
  avg: number;
  bestMonth: number;
  worstMonth: number;
}

/**
 * 生成年度报告：passRate 直接用 avgScore 作为合格率。
 *
 * @param year 年份
 * @param data 年度数据
 * @returns 年度报告
 */
export function buildAnnualReport(year: number, data: AnnualReportInputV14): AnnualReportV14 {
  return {
    year,
    totalRecords: data.totalRecords,
    avgScore: data.avgScore,
    defectCount: data.defectCount,
    passRate: data.avgScore,
  };
}

/**
 * 汇总 12 个月趋势：avg=平均值，bestMonth=最高分月份索引（1-12），worstMonth=最低分月份索引。
 *
 * @param monthlyScores 12 个月评分
 * @returns 年度趋势汇总
 */
export function summarizeYearlyTrends(monthlyScores: number[]): YearlyTrendV14 {
  if (monthlyScores.length === 0) {
    return { avg: 0, bestMonth: 1, worstMonth: 1 };
  }
  const sum = monthlyScores.reduce((acc, s) => acc + s, 0);
  const avg = Math.round((sum / monthlyScores.length) * 10) / 10;
  let bestMonth = 1;
  let worstMonth = 1;
  let bestScore = monthlyScores[0];
  let worstScore = monthlyScores[0];
  monthlyScores.forEach((score, idx) => {
    if (score > bestScore) {
      bestScore = score;
      bestMonth = idx + 1;
    }
    if (score < worstScore) {
      worstScore = score;
      worstMonth = idx + 1;
    }
  });
  return { avg, bestMonth, worstMonth };
}
