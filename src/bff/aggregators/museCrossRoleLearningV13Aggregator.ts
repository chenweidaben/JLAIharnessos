/**
 * 健澜科技 jlmedaios - 跨角色经验互鉴 V13 纯函数（M321-B）
 *
 * countDoctorToNurseReferencesV13 / countNurseToDoctorReferencesV13 / computeCrossRoleClosureRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 跨角色经验流转记录 */
export interface CrossRoleRecordV13 {
  recordId: string;
  fromRole: "doctor" | "nurse";
  toRole: "doctor" | "nurse";
  isBidirectional: boolean;
}

/**
 * 医生经验被护士引用次数（纯函数）。
 *
 * @param records 跨角色经验流转记录列表
 * @returns 医生→护士引用次数
 */
export function countDoctorToNurseReferencesV13(records: CrossRoleRecordV13[]): number {
  return records.filter((r) => r.fromRole === "doctor" && r.toRole === "nurse").length;
}

/**
 * 护士经验回灌医生次数（纯函数）。
 *
 * @param records 跨角色经验流转记录列表
 * @returns 护士→医生回灌次数
 */
export function countNurseToDoctorReferencesV13(records: CrossRoleRecordV13[]): number {
  return records.filter((r) => r.fromRole === "nurse" && r.toRole === "doctor").length;
}

/**
 * 跨角色闭环率（纯函数）：双向流转次数/总经验数×100。
 *
 * @param records 跨角色经验流转记录列表
 * @returns 闭环率百分比
 */
export function computeCrossRoleClosureRateV13(records: CrossRoleRecordV13[]): number {
  if (records.length === 0) return 0;
  const bidirectional = records.filter((r) => r.isBidirectional).length;
  return Math.round((bidirectional / records.length) * 100);
}
