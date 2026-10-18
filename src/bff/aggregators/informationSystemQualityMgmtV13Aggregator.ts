/**
 * 健澜科技 jlmedaios - 信息系统质量管理 V13 纯函数（M432-A，-quality 后缀避让旧版 informationSystemMgmtV13（M409））
 *
 * computeSystemAvailabilityRateV13 / computeSystemResponseTimeMinutesV13 / computeSystemFailureRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 信息系统质量管理记录 */
export interface InformationSystemQualityMgmtRecordV13 {
  availableMinutes: number;
  requiredMinutes: number;
  responseMinutes: number;
  failureCount: number;
  runTotal: number;
}

/**
 * 系统可用率（纯函数）：可用时长/应运行时长×100，保留 2 位小数。
 *
 * @param records 信息系统质量管理记录列表
 * @returns 系统可用率百分比
 */
export function computeSystemAvailabilityRateV13(records: InformationSystemQualityMgmtRecordV13[]): number {
  const required = records.reduce((acc, r) => acc + r.requiredMinutes, 0);
  if (required === 0) return 0;
  const available = records.reduce((acc, r) => acc + r.availableMinutes, 0);
  return Math.round((available / required) * 10000) / 100;
}

/**
 * 系统响应时间（纯函数）：平均值，单位分钟，Math.ceil 整分钟向上取整。
 *
 * @param records 信息系统质量管理记录列表
 * @returns 系统响应时间平均值（整分钟）
 */
export function computeSystemResponseTimeMinutesV13(records: InformationSystemQualityMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.responseMinutes, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}

/**
 * 系统故障率（纯函数，百分率%，反向指标，值越低越好）：故障次数/运行总次数×100，保留 2 位小数。
 *
 * @param records 信息系统质量管理记录列表
 * @returns 系统故障率百分比
 */
export function computeSystemFailureRateV13(records: InformationSystemQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.runTotal, 0);
  if (total === 0) return 0;
  const failure = records.reduce((acc, r) => acc + r.failureCount, 0);
  return Math.round((failure / total) * 10000) / 100;
}
