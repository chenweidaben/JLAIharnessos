/**
 * 健澜科技 jlmedaios - 门诊换药管理 V13 纯函数（M458-D，M458 收官，日间手术与门诊操作管理组）
 *
 * computeOutpatientDressingVisitCountV13 / computeOutpatientDressingQualifiedRateV13 / computeOutpatientDressingAverageMinutesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊换药管理记录 */
export interface OutpatientDressingMgmtRecordV13 {
  visitCount: number;
  minutes: number;
  qualified: number;
  total: number;
}

/**
 * 换药人次（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.visitCount, 0)，直接返回计数。
 *
 * @param records 门诊换药管理记录列表
 * @returns 换药总人次（人次）
 */
export function computeOutpatientDressingVisitCountV13(records: OutpatientDressingMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.visitCount, 0);
}

/**
 * 换药合格率（纯函数）：合格换药数/换药总数×100，保留 2 位小数。
 *
 * @param records 门诊换药管理记录列表
 * @returns 换药合格率百分比
 */
export function computeOutpatientDressingQualifiedRateV13(records: OutpatientDressingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 换药平均时长（纯函数）：records.reduce((acc, r) => acc + r.minutes, 0) / records.length，Math.ceil(avg) 直接向上取整到整分钟。
 *
 * @param records 门诊换药管理记录列表
 * @returns 换药平均时长（分钟，整分钟）
 */
export function computeOutpatientDressingAverageMinutesV13(records: OutpatientDressingMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.minutes, 0);
  return Math.ceil(sum / records.length);
}
