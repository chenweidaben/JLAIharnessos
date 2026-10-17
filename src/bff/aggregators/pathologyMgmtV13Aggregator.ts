/**
 * 健澜科技 jlmedaios - 病理管理 V13 纯函数（M415-C）
 *
 * computeRoutinePathologyReportTimelyRateV13 / computePathologyDiagnosisMatchRateV13 / computeFrozenVsParaffinMatchRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病理管理记录 */
export interface PathologyMgmtRecordV13 {
  timely: number;
  reportTotal: number;
  match: number;
  diagnosisTotal: number;
  frozenParaffinMatch: number;
  frozenTotal: number;
}

/**
 * 常规病理报告及时率（纯函数）：及时报告份数/常规病理报告总数×100，保留 2 位小数。
 *
 * @param records 病理管理记录列表
 * @returns 常规病理报告及时率百分比
 */
export function computeRoutinePathologyReportTimelyRateV13(records: PathologyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 病理诊断符合率（纯函数）：符合份数/病理诊断总数×100，保留 2 位小数。
 *
 * @param records 病理管理记录列表
 * @returns 病理诊断符合率百分比
 */
export function computePathologyDiagnosisMatchRateV13(records: PathologyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.diagnosisTotal, 0);
  if (total === 0) return 0;
  const match = records.reduce((acc, r) => acc + r.match, 0);
  return Math.round((match / total) * 10000) / 100;
}

/**
 * 冰冻病理与石蜡诊断符合率（纯函数）：冰冻与石蜡符合例数/冰冻总数×100，保留 2 位小数。
 *
 * @param records 病理管理记录列表
 * @returns 冰冻病理与石蜡诊断符合率百分比
 */
export function computeFrozenVsParaffinMatchRateV13(records: PathologyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.frozenTotal, 0);
  if (total === 0) return 0;
  const frozenParaffinMatch = records.reduce((acc, r) => acc + r.frozenParaffinMatch, 0);
  return Math.round((frozenParaffinMatch / total) * 10000) / 100;
}
