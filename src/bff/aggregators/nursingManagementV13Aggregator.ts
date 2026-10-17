/**
 * 健澜科技 jlmedaios - 护理管理 V13 纯函数（M376-D，M376 收官）
 *
 * computeNursingUnitCountV13 / computeBedNurseRatioV13 / computeNursingTrainingCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理管理记录 */
export interface NursingManagementRecordV13 {
  nursingUnitCount: number;
  bedCount: number;
  nurseCount: number;
  shouldTrainCount: number;
  trainCompleteCount: number;
}

/**
 * 护理单元数（纯函数）：求和。
 *
 * @param records 护理管理记录列表
 * @returns 护理单元数
 */
export function computeNursingUnitCountV13(records: NursingManagementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.nursingUnitCount, 0);
}

/**
 * 床护比（纯函数）：护士总数/床位数，保留 2 位小数。
 *
 * @param records 护理管理记录列表
 * @returns 床护比
 */
export function computeBedNurseRatioV13(records: NursingManagementRecordV13[]): number {
  const beds = records.reduce((acc, r) => acc + r.bedCount, 0);
  if (beds === 0) return 0;
  const nurses = records.reduce((acc, r) => acc + r.nurseCount, 0);
  return Math.round((nurses / beds) * 100) / 100;
}

/**
 * 护理培训完成率（纯函数）：完成数/应培训数×100，保留 2 位小数。
 *
 * @param records 护理管理记录列表
 * @returns 护理培训完成率百分比
 */
export function computeNursingTrainingCompletionRateV13(records: NursingManagementRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldTrainCount, 0);
  if (should === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.trainCompleteCount, 0);
  return Math.round((complete / should) * 10000) / 100;
}
