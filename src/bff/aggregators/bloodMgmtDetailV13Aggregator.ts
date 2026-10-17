/**
 * 健澜科技 jlmedaios - 输血管理 V13 纯函数（M392-D，M392 收官）
 *
 * computeTransfusionApplicationRateV13 / computeTransfusionAdverseReactionRateV13 / computePreTransfusionTestCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 输血管理记录 */
export interface BloodMgmtDetailRecordV13 {
  applicationCount: number;
  patientTotalCount: number;
  adverseCount: number;
  transfusionCount: number;
  completedCount: number;
  shouldCount: number;
}

/**
 * 输血申请率（纯函数）：输血申请例数/住院手术或危重患者总数×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 输血申请率百分比
 */
export function computeTransfusionApplicationRateV13(records: BloodMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.patientTotalCount, 0);
  if (total === 0) return 0;
  const application = records.reduce((acc, r) => acc + r.applicationCount, 0);
  return Math.round((application / total) * 10000) / 100;
}

/**
 * 输血不良反应率（纯函数）：不良反应例数/输血例数×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 输血不良反应率百分比
 */
export function computeTransfusionAdverseReactionRateV13(records: BloodMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionCount, 0);
  if (total === 0) return 0;
  const adverse = records.reduce((acc, r) => acc + r.adverseCount, 0);
  return Math.round((adverse / total) * 10000) / 100;
}

/**
 * 输血前检验完成率（纯函数）：已完成检验例数/应完成检验例数×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 输血前检验完成率百分比
 */
export function computePreTransfusionTestCompletionRateV13(records: BloodMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  return Math.round((completed / total) * 10000) / 100;
}
