/**
 * 健澜科技 jlmedaios - 重点学科建设管理 V13 纯函数（M456-A，学科建设与科研管理组）
 *
 * computeDisciplineConstructionAnnualAssessmentRateV13 / computeDisciplineConstructionLeaderComplianceRateV13 / computeDisciplineConstructionFundExecutionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 重点学科建设管理记录 */
export interface DisciplineConstructionMgmtRecordV13 {
  qualified: number;
  totalDiscipline: number;
  compliant: number;
  totalLeader: number;
  executed: number;
  totalFund: number;
}

/**
 * 重点学科年度考核合格率（纯函数）：年度考核合格学科数/重点学科总数×100，保留 2 位小数。
 *
 * @param records 重点学科建设管理记录列表
 * @returns 重点学科年度考核合格率百分比
 */
export function computeDisciplineConstructionAnnualAssessmentRateV13(records: DisciplineConstructionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDiscipline, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 学科带头人履职达标率（纯函数）：履职达标带头人数/学科带头人总数×100，保留 2 位小数。
 *
 * @param records 重点学科建设管理记录列表
 * @returns 学科带头人履职达标率百分比
 */
export function computeDisciplineConstructionLeaderComplianceRateV13(records: DisciplineConstructionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalLeader, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 学科经费执行率（纯函数）：已执行学科经费金额/学科经费总额×100，保留 2 位小数。
 *
 * @param records 重点学科建设管理记录列表
 * @returns 学科经费执行率百分比
 */
export function computeDisciplineConstructionFundExecutionRateV13(records: DisciplineConstructionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFund, 0);
  if (total === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executed, 0);
  return Math.round((executed / total) * 10000) / 100;
}
