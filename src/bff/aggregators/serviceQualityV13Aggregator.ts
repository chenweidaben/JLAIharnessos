/**
 * 健澜科技 jlmedaios - 服务质量 V13 纯函数（M386-B）
 *
 * computeServiceStandardComplianceRateV13 / computeWindowServiceHoursV13 / computeSmileServiceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 服务质量记录 */
export interface ServiceQualityRecordV13 {
  compliantCount: number;
  totalCheckCount: number;
  windowHours: number;
  smileCount: number;
  totalServiceCount: number;
}

/**
 * 服务规范达标率（纯函数）：达标项数/检查项数×100，保留 2 位小数。
 *
 * @param records 服务质量记录列表
 * @returns 服务规范达标率百分比
 */
export function computeServiceStandardComplianceRateV13(records: ServiceQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCheckCount, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantCount, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 窗口服务时长（纯函数）：求和。
 *
 * @param records 服务质量记录列表
 * @returns 窗口服务时长（小时）
 */
export function computeWindowServiceHoursV13(records: ServiceQualityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.windowHours, 0);
}

/**
 * 微笑服务率（纯函数）：微笑服务人次/服务总人次×100，保留 2 位小数。
 *
 * @param records 服务质量记录列表
 * @returns 微笑服务率百分比
 */
export function computeSmileServiceRateV13(records: ServiceQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalServiceCount, 0);
  if (total === 0) return 0;
  const smile = records.reduce((acc, r) => acc + r.smileCount, 0);
  return Math.round((smile / total) * 10000) / 100;
}
