/**
 * 健澜科技 jlmedaios - 排班管理 V13 纯函数（M402-A）
 *
 * computeSchedulingAccuracyRateV13 / computeNurseSchedulingComplianceRateV13 / computePhysicianOnDutyCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 排班管理记录 */
export interface SchedulingMgmtRecordV13 {
  accurateScheduling: number;
  totalScheduling: number;
  compliantNurse: number;
  totalNurse: number;
  actualOnDuty: number;
  requiredOnDuty: number;
}

/**
 * 排班准确率（纯函数）：准确排班数/应排班总数×100，保留 2 位小数。
 *
 * @param records 排班管理记录列表
 * @returns 排班准确率百分比
 */
export function computeSchedulingAccuracyRateV13(records: SchedulingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalScheduling, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurateScheduling, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 护士排班合规率（纯函数）：合规排班数/护士排班总数×100，保留 2 位小数。
 *
 * @param records 排班管理记录列表
 * @returns 护士排班合规率百分比
 */
export function computeNurseSchedulingComplianceRateV13(records: SchedulingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalNurse, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantNurse, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 医师值班覆盖率（纯函数）：实际值班天数/应值班天数×100，保留 2 位小数。
 *
 * @param records 排班管理记录列表
 * @returns 医师值班覆盖率百分比
 */
export function computePhysicianOnDutyCoverageRateV13(records: SchedulingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.requiredOnDuty, 0);
  if (total === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actualOnDuty, 0);
  return Math.round((actual / total) * 10000) / 100;
}
