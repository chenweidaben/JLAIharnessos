/**
 * 健澜科技 jlmedaios - ICD 编码辅助推荐 V13 纯函数（M315-A）
 *
 * recommendIcdCodeV13 / computeCodingHitRateV13 / computeCodingAccuracyV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ICD 编码库条目 */
export interface IcdLibraryItemV13 {
  code: string;
  keyword: string;
}

/** 编码记录（用于命中率/准确率统计） */
export interface CodingRecordV13 {
  recommendedMainCode: string;
  correctMainCode: string;
  isRecommendationCorrect: boolean;
}

/** 推荐结果 */
export interface IcdRecommendV13 {
  mainCode: string;
  additionalCodes: string[];
}

/**
 * 根据诊断描述推荐 ICD 编码（纯函数）：主编码 1 个 + 附加编码 N 个。
 *
 * @param diagnosisText 诊断描述
 * @param library 编码库
 * @returns 推荐结果
 */
export function recommendIcdCodeV13(
  diagnosisText: string,
  library: IcdLibraryItemV13[],
): IcdRecommendV13 {
  const matched = library.filter((item) => diagnosisText.includes(item.keyword));
  if (matched.length === 0) {
    return { mainCode: "", additionalCodes: [] };
  }
  return {
    mainCode: matched[0].code,
    additionalCodes: matched.slice(1).map((m) => m.code),
  };
}

/**
 * 命中率（纯函数）：推荐正确的记录数/总记录数×100。
 *
 * @param records 编码记录
 * @returns 命中率百分比
 */
export function computeCodingHitRateV13(records: CodingRecordV13[]): number {
  if (records.length === 0) return 0;
  const correct = records.filter((r) => r.isRecommendationCorrect).length;
  return Math.round((correct / records.length) * 100);
}

/**
 * 准确率（纯函数）：主编码正确数/总记录数×100。
 *
 * @param records 编码记录
 * @returns 准确率百分比
 */
export function computeCodingAccuracyV13(records: CodingRecordV13[]): number {
  if (records.length === 0) return 0;
  const correct = records.filter((r) => r.recommendedMainCode === r.correctMainCode).length;
  return Math.round((correct / records.length) * 100);
}
