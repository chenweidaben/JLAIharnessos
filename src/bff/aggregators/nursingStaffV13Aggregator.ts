/**
 * 健澜科技 jlmedaios - 护理人员配置 V13 纯函数（M369-C）
 *
 * computeBedNurseRatioV13 / computeNurseTotalCountV13 / computeCollegeAboveNurseRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理人员配置记录 */
export interface NursingStaffRecordV13 {
  bedCount: number;
  nurseCount: number;
  collegeAboveCount: number;
}

/**
 * 床护比（纯函数）：护士总数/床位数，保留 2 位小数。
 *
 * @param records 护理人员配置记录列表
 * @returns 床护比
 */
export function computeBedNurseRatioV13(records: NursingStaffRecordV13[]): number {
  const beds = records.reduce((acc, r) => acc + r.bedCount, 0);
  if (beds === 0) return 0;
  const nurses = records.reduce((acc, r) => acc + r.nurseCount, 0);
  return Math.round((nurses / beds) * 100) / 100;
}

/**
 * 护士总数（纯函数）：求和。
 *
 * @param records 护理人员配置记录列表
 * @returns 护士总数
 */
export function computeNurseTotalCountV13(records: NursingStaffRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.nurseCount, 0);
}

/**
 * 大专以上护士占比（纯函数）：大专以上人数/护士总数×100，保留 2 位小数。
 *
 * @param records 护理人员配置记录列表
 * @returns 大专以上护士占比百分比
 */
export function computeCollegeAboveNurseRatioV13(records: NursingStaffRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.nurseCount, 0);
  if (total === 0) return 0;
  const college = records.reduce((acc, r) => acc + r.collegeAboveCount, 0);
  return Math.round((college / total) * 10000) / 100;
}
