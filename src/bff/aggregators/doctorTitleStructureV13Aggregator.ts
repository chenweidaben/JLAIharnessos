/**
 * 健澜科技 jlmedaios - 医师职称结构 V13 纯函数（M346-B）
 *
 * computeProfessorCountV13 / computeAssociateProfessorCountV13 /
 * computeAttendingCountV13 / computeResidentDoctorCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医师职称结构记录 */
export interface DoctorTitleRecordV13 {
  professorCount: number;
  associateProfessorCount: number;
  attendingCount: number;
  residentDoctorCount: number;
}

/**
 * 正高人数（纯函数）：求和。
 *
 * @param records 医师职称结构记录列表
 * @returns 正高人数
 */
export function computeProfessorCountV13(records: DoctorTitleRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.professorCount, 0);
}

/**
 * 副高人数（纯函数）：求和。
 *
 * @param records 医师职称结构记录列表
 * @returns 副高人数
 */
export function computeAssociateProfessorCountV13(records: DoctorTitleRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.associateProfessorCount, 0);
}

/**
 * 中级人数（纯函数）：求和。
 *
 * @param records 医师职称结构记录列表
 * @returns 中级人数
 */
export function computeAttendingCountV13(records: DoctorTitleRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.attendingCount, 0);
}

/**
 * 初级人数（纯函数）：求和。
 *
 * @param records 医师职称结构记录列表
 * @returns 初级人数
 */
export function computeResidentDoctorCountV13(records: DoctorTitleRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.residentDoctorCount, 0);
}
