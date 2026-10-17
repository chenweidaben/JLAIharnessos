/**
 * 健澜科技 jlmedaios - 继续教育明细 V13 纯函数（M397-D，M397 收官，避让旧版 continuingEducationV13/continuingEducationStatsV13）
 *
 * computeContinuingEducationProjectCountV13 / computeContinuingEducationCreditComplianceRateV13 / computeOutboundTrainingCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 继续教育明细记录 */
export interface ContinuingEducationDetailRecordV13 {
  projectCount: number;
  compliantCount: number;
  totalCount: number;
  outboundCount: number;
}

/**
 * 继教项目数（纯函数）：求和。
 *
 * @param records 继续教育明细记录列表
 * @returns 继教项目数
 */
export function computeContinuingEducationProjectCountV13(records: ContinuingEducationDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.projectCount, 0);
}

/**
 * 继教学分达标率（纯函数）：达标人数/应达标人数×100，保留 2 位小数。
 *
 * @param records 继续教育明细记录列表
 * @returns 继教学分达标率百分比
 */
export function computeContinuingEducationCreditComplianceRateV13(records: ContinuingEducationDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantCount, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 外出进修人数（纯函数）：求和。
 *
 * @param records 继续教育明细记录列表
 * @returns 外出进修人数
 */
export function computeOutboundTrainingCountV13(records: ContinuingEducationDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.outboundCount, 0);
}
