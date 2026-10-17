/**
 * 健澜科技 jlmedaios - 学科建设 V13 纯函数（M397-A）
 *
 * computeKeyDisciplineCountV13 / computeDisciplineLeaderCountV13 / computeSpecialtyReputationRankV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 专科声誉排名 */
export interface SpecialtyReputationRankV13 {
  rank: number;
  deptName: string;
}

/** 学科建设记录 */
export interface DisciplineConstructionRecordV13 {
  keyDisciplineCount: number;
  leaderCount: number;
  rank: number;
  deptName: string;
}

/**
 * 重点学科数（纯函数）：求和。
 *
 * @param records 学科建设记录列表
 * @returns 重点学科数
 */
export function computeKeyDisciplineCountV13(records: DisciplineConstructionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.keyDisciplineCount, 0);
}

/**
 * 学科带头人数量（纯函数）：求和。
 *
 * @param records 学科建设记录列表
 * @returns 学科带头人数量
 */
export function computeDisciplineLeaderCountV13(records: DisciplineConstructionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.leaderCount, 0);
}

/**
 * 专科声誉排名（纯函数）：返回第一条记录的排名对象。
 *
 * @param records 学科建设记录列表
 * @returns 专科声誉排名对象 {rank, deptName}
 */
export function computeSpecialtyReputationRankV13(records: DisciplineConstructionRecordV13[]): SpecialtyReputationRankV13 {
  if (records.length === 0) return { rank: 0, deptName: "" };
  const first = records[0];
  return { rank: first.rank, deptName: first.deptName };
}
