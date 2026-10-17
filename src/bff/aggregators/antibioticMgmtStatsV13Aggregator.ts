/**
 * 健澜科技 jlmedaios - 抗菌药物管理（统计）V13 纯函数（M368-C，stats避让）
 *
 * computeAntibioticUsageRateV13 / computeAntibioticDddsV13 / computeSpecialAntibioticUsageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抗菌药物管理（统计）记录 */
export interface AntibioticMgmtStatsRecordV13 {
  visitCount: number;
  antibioticUsed: number;
  ddds: number;
  specialLevelUsed: number;
}

/**
 * 抗菌药物使用率（纯函数）：使用人数/就诊人数×100，保留 2 位小数。
 *
 * @param records 抗菌药物管理记录列表
 * @returns 抗菌药物使用率百分比
 */
export function computeAntibioticUsageRateV13(records: AntibioticMgmtStatsRecordV13[]): number {
  const visits = records.reduce((acc, r) => acc + r.visitCount, 0);
  if (visits === 0) return 0;
  const used = records.reduce((acc, r) => acc + r.antibioticUsed, 0);
  return Math.round((used / visits) * 10000) / 100;
}

/**
 * 使用强度 DDDs（纯函数）：求和，保留 2 位小数。
 *
 * @param records 抗菌药物管理记录列表
 * @returns 使用强度 DDDs
 */
export function computeAntibioticDddsV13(records: AntibioticMgmtStatsRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.ddds, 0);
  return Math.round(total * 100) / 100;
}

/**
 * 特殊级抗菌药物使用率（纯函数）：特殊级使用人数/抗菌药物使用人数×100，保留 2 位小数。
 *
 * @param records 抗菌药物管理记录列表
 * @returns 特殊级抗菌药物使用率百分比
 */
export function computeSpecialAntibioticUsageRateV13(records: AntibioticMgmtStatsRecordV13[]): number {
  const used = records.reduce((acc, r) => acc + r.antibioticUsed, 0);
  if (used === 0) return 0;
  const special = records.reduce((acc, r) => acc + r.specialLevelUsed, 0);
  return Math.round((special / used) * 10000) / 100;
}
