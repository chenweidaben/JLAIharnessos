/**
 * 健澜科技 jlmedaios - 患者服务 V13 纯函数（M400-A）
 *
 * computeOneStopServiceCenterCountV13 / computeWheelchairRentalCountV13 / computeFreeBloodPressureCheckCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者服务记录 */
export interface PatientServiceRecordV13 {
  oneStopCount: number;
  wheelchairCount: number;
  bpCheckCount: number;
}

/**
 * 一站式服务中心办件数（纯函数）：求和。
 *
 * @param records 患者服务记录列表
 * @returns 一站式服务中心办件数
 */
export function computeOneStopServiceCenterCountV13(records: PatientServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.oneStopCount, 0);
}

/**
 * 轮椅租借次数（纯函数）：求和。
 *
 * @param records 患者服务记录列表
 * @returns 轮椅租借次数
 */
export function computeWheelchairRentalCountV13(records: PatientServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.wheelchairCount, 0);
}

/**
 * 免费测血压次数（纯函数）：求和。
 *
 * @param records 患者服务记录列表
 * @returns 免费测血压次数
 */
export function computeFreeBloodPressureCheckCountV13(records: PatientServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.bpCheckCount, 0);
}
