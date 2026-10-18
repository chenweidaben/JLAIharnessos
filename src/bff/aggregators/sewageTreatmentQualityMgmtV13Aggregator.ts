/**
 * 健澜科技 jlmedaios - 污水处理质量管理 V13 纯函数（M436-A，院感安全环保质量管理深化组）
 *
 * computeSewageTreatmentStandardRateV13 / computeSewageTreatmentQualifiedRateV13 / computeSewageTreatmentOperationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 污水处理质量管理记录 */
export interface SewageTreatmentQualityMgmtRecordV13 {
  standardCount: number;
  totalCount: number;
  qualifiedVolume: number;
  totalVolume: number;
  actualHours: number;
  shouldHours: number;
}

/**
 * 污水处理达标率（纯函数）：达标处理次数/监测总次数×100，保留 2 位小数。
 *
 * @param records 污水处理质量管理记录列表
 * @returns 污水处理达标率百分比
 */
export function computeSewageTreatmentStandardRateV13(records: SewageTreatmentQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const standard = records.reduce((acc, r) => acc + r.standardCount, 0);
  return Math.round((standard / total) * 10000) / 100;
}

/**
 * 污水处理合格率（纯函数）：合格处理量/处理总量×100，保留 2 位小数。
 *
 * @param records 污水处理质量管理记录列表
 * @returns 污水处理合格率百分比
 */
export function computeSewageTreatmentQualifiedRateV13(records: SewageTreatmentQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalVolume, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedVolume, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 污水处理运行率（纯函数）：实际运行时长/应运行时长×100，保留 2 位小数。
 *
 * @param records 污水处理质量管理记录列表
 * @returns 污水处理运行率百分比
 */
export function computeSewageTreatmentOperationRateV13(records: SewageTreatmentQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldHours, 0);
  if (total === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actualHours, 0);
  return Math.round((actual / total) * 10000) / 100;
}
