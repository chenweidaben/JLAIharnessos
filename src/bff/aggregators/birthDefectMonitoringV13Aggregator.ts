/**
 * 健澜科技 jlmedaios - 出生缺陷监测 V13 纯函数（M442-C，妇幼健康与计划生育管理组）
 *
 * computeBirthDefectRateV13 / computeBirthDefectPrenatalScreeningRateV13 / computeBirthDefectInterventionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 出生缺陷监测记录 */
export interface BirthDefectMonitoringRecordV13 {
  birthDefectCount: number;
  perinatalTotal: number;
  prenatalScreened: number;
  totalMaternal: number;
  intervenedDefect: number;
  totalDefect: number;
}

/**
 * 出生缺陷发生率（纯函数，万分之率，反向指标，越低越好）：出生缺陷例数/围生儿总数×10000，保留 2 位小数。
 *
 * @param records 出生缺陷监测记录列表
 * @returns 出生缺陷发生率（/万）
 */
export function computeBirthDefectRateV13(records: BirthDefectMonitoringRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.perinatalTotal, 0);
  if (total === 0) return 0;
  const defect = records.reduce((acc, r) => acc + r.birthDefectCount, 0);
  return Math.round((defect / total) * 1000000) / 100;
}

/**
 * 产前筛查率（纯函数）：已产前筛查孕产妇数/孕产妇总数×100，保留 2 位小数。
 *
 * @param records 出生缺陷监测记录列表
 * @returns 产前筛查率百分比
 */
export function computeBirthDefectPrenatalScreeningRateV13(records: BirthDefectMonitoringRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMaternal, 0);
  if (total === 0) return 0;
  const screened = records.reduce((acc, r) => acc + r.prenatalScreened, 0);
  return Math.round((screened / total) * 10000) / 100;
}

/**
 * 缺陷儿干预率（纯函数）：已干预缺陷儿数/缺陷儿总数×100，保留 2 位小数。
 *
 * @param records 出生缺陷监测记录列表
 * @returns 缺陷儿干预率百分比
 */
export function computeBirthDefectInterventionRateV13(records: BirthDefectMonitoringRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDefect, 0);
  if (total === 0) return 0;
  const intervened = records.reduce((acc, r) => acc + r.intervenedDefect, 0);
  return Math.round((intervened / total) * 10000) / 100;
}
