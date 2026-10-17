/**
 * 健澜科技 jlmedaios - 科研管理 V13 纯函数（M361-A）
 *
 * computeResearchProjectCountV13 / computeResearchFundsReceivedV13 / computeResearchOutcomeConversionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科研管理记录 */
export interface ResearchMgmtRecordV13 {
  projectCount: number;
  fundsReceived: number;
  outcomeConverted: number;
  outcomeTotal: number;
}

/**
 * 科研项目立项数（纯函数）：求和。
 *
 * @param records 科研管理记录列表
 * @returns 科研项目立项数
 */
export function computeResearchProjectCountV13(records: ResearchMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.projectCount, 0);
}

/**
 * 科研经费到账额（纯函数）：求和，单位万元，保留 2 位小数。
 *
 * @param records 科研管理记录列表
 * @returns 科研经费到账额（万元）
 */
export function computeResearchFundsReceivedV13(records: ResearchMgmtRecordV13[]): number {
  const sum = records.reduce((acc, r) => acc + r.fundsReceived, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * 科研成果转化率（纯函数）：转化成果数/成果总数×100，保留 2 位小数。
 *
 * @param records 科研管理记录列表
 * @returns 科研成果转化率百分比
 */
export function computeResearchOutcomeConversionRateV13(records: ResearchMgmtRecordV13[]): number {
  const converted = records.reduce((acc, r) => acc + r.outcomeConverted, 0);
  const total = records.reduce((acc, r) => acc + r.outcomeTotal, 0);
  if (total === 0) return 0;
  return Math.round((converted / total) * 10000) / 100;
}
