/**
 * 健澜科技 jlmedaios - 医生工作量 V13 纯函数（M330-A）
 *
 * computeAvgOutpatientV13 / computeAvgInpatientDaysV13 / computeTotalSurgeriesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生工作量 */
export interface DoctorWorkloadV13 {
  doctorName: string;
  outpatientCount: number;
  inpatientDays: number;
  surgeryCount: number;
}

/**
 * 人均门诊量（纯函数）：均值。
 *
 * @param doctors 医生列表
 * @returns 人均门诊量
 */
export function computeAvgOutpatientV13(doctors: DoctorWorkloadV13[]): number {
  if (doctors.length === 0) return 0;
  const total = doctors.reduce((acc, d) => acc + d.outpatientCount, 0);
  return Math.round(total / doctors.length);
}

/**
 * 人均住院床日（纯函数）：均值。
 *
 * @param doctors 医生列表
 * @returns 人均床日
 */
export function computeAvgInpatientDaysV13(doctors: DoctorWorkloadV13[]): number {
  if (doctors.length === 0) return 0;
  const total = doctors.reduce((acc, d) => acc + d.inpatientDays, 0);
  return Math.round(total / doctors.length);
}

/**
 * 手术量汇总（纯函数）：求和。
 *
 * @param doctors 医生列表
 * @returns 手术总量
 */
export function computeTotalSurgeriesV13(doctors: DoctorWorkloadV13[]): number {
  return doctors.reduce((acc, d) => acc + d.surgeryCount, 0);
}
