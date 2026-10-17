/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 纯函数（M354-D，M354 收官）
 *
 * computeCreditComplianceRateV13 / computeAnnualTrainingCountV13 / computeThreeBaseExamPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 继续医学教育记录 */
export interface ContinuingEducationStatsRecordV13 {
  creditCompliantCount: number;
  creditDueCount: number;
  annualTrainingCount: number;
  threeBasePassCount: number;
  threeBaseTookCount: number;
}

/**
 * 学分达标率（纯函数）：达标人数/应达标人数×100，保留 2 位小数。
 *
 * @param records 继续医学教育记录列表
 * @returns 学分达标率百分比
 */
export function computeCreditComplianceRateV13(records: ContinuingEducationStatsRecordV13[]): number {
  const compliant = records.reduce((acc, r) => acc + r.creditCompliantCount, 0);
  const due = records.reduce((acc, r) => acc + r.creditDueCount, 0);
  if (due === 0) return 0;
  return Math.round((compliant / due) * 10000) / 100;
}

/**
 * 年度培训人次（纯函数）：求和。
 *
 * @param records 继续医学教育记录列表
 * @returns 年度培训人次
 */
export function computeAnnualTrainingCountV13(records: ContinuingEducationStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.annualTrainingCount, 0);
}

/**
 * 三基考核合格率（纯函数）：合格数/参考数×100，保留 2 位小数。
 *
 * @param records 继续医学教育记录列表
 * @returns 三基考核合格率百分比
 */
export function computeThreeBaseExamPassRateV13(records: ContinuingEducationStatsRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.threeBasePassCount, 0);
  const took = records.reduce((acc, r) => acc + r.threeBaseTookCount, 0);
  if (took === 0) return 0;
  return Math.round((passed / took) * 10000) / 100;
}
