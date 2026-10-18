/**
 * 健澜科技 jlmedaios - 学科建设质量管理 V13 纯函数（M434-D，M434 收官，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * computeDisciplineKeyDisciplineCountV13 / computeDisciplineLeaderCountV13 / computeDisciplineInfluenceScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 学科建设质量管理记录 */
export interface DisciplineConstructionQualityMgmtRecordV13 {
  keyDisciplineCount: number;
  leaderCount: number;
  influenceScore: number;
}

/**
 * 重点学科数（纯函数，整数求和类，单位个）：对 keyDisciplineCount 求和。
 *
 * @param records 学科建设质量管理记录列表
 * @returns 重点学科数（整数个）
 */
export function computeDisciplineKeyDisciplineCountV13(records: DisciplineConstructionQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.keyDisciplineCount, 0);
}

/**
 * 学科带头人人数（纯函数，整数求和类，单位人）：对 leaderCount 求和。
 *
 * @param records 学科建设质量管理记录列表
 * @returns 学科带头人人数（整数人）
 */
export function computeDisciplineLeaderCountV13(records: DisciplineConstructionQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.leaderCount, 0);
}

/**
 * 学科影响力评分（纯函数，平均值类，保留 2 位小数）：influenceScore 平均值。
 *
 * @param records 学科建设质量管理记录列表
 * @returns 学科影响力评分（平均值，保留 2 位小数）
 */
export function computeDisciplineInfluenceScoreV13(records: DisciplineConstructionQualityMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.influenceScore, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
