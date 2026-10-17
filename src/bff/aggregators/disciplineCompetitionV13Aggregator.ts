/**
 * 健澜科技 jlmedaios - 学科竞赛 V13 纯函数（M403-C）
 *
 * computeNationalClinicalKeySpecialtyRankingV13 / computeFudanRankingCountV13 / computeBestSpecialtyReputationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 学科竞赛记录 */
export interface DisciplineCompetitionRecordV13 {
  nationalRanking: number;
  fudanCount: number;
  reputationCount: number;
}

/**
 * 国家临床重点专科排名（纯函数）：取最佳排名（最小值，数值越小排名越靠前）。
 *
 * @param records 学科竞赛记录列表
 * @returns 国家临床重点专科最佳排名
 */
export function computeNationalClinicalKeySpecialtyRankingV13(records: DisciplineCompetitionRecordV13[]): number {
  if (records.length === 0) return 0;
  return Math.min(...records.map((r) => r.nationalRanking));
}

/**
 * 复旦排行榜上榜数（纯函数）：求和。
 *
 * @param records 学科竞赛记录列表
 * @returns 复旦排行榜上榜数
 */
export function computeFudanRankingCountV13(records: DisciplineCompetitionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.fudanCount, 0);
}

/**
 * 最佳专科声誉数（纯函数）：求和。
 *
 * @param records 学科竞赛记录列表
 * @returns 最佳专科声誉数
 */
export function computeBestSpecialtyReputationCountV13(records: DisciplineCompetitionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.reputationCount, 0);
}
