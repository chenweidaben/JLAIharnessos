/**
 * 健澜科技 jlmedaios - 继续教育学分 V13 纯函数（M327-C）
 *
 * computeDoctorCreditRateV13 / countNationalProjectsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 继续教育学分记录 */
export interface EducationCreditV13 {
  doctorName: string;
  isQualified: boolean;
  isNationalProject: boolean;
}

/**
 * 医生学分达标率（纯函数）：达标人数/应修人数×100。
 *
 * @param records 学分记录列表
 * @returns 达标率百分比
 */
export function computeDoctorCreditRateV13(records: EducationCreditV13[]): number {
  if (records.length === 0) return 0;
  const qualified = records.filter((r) => r.isQualified).length;
  return Math.round((qualified / records.length) * 100);
}

/**
 * 国家级项目参与数（纯函数）：计数。
 *
 * @param records 学分记录列表
 * @returns 国家级项目数
 */
export function countNationalProjectsV13(records: EducationCreditV13[]): number {
  return records.filter((r) => r.isNationalProject).length;
}
