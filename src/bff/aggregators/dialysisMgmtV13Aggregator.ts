/**
 * 健澜科技 jlmedaios - 血液透析管理 V13 纯函数（M417-A）
 *
 * computeDialysisKtvPassRateV13 / computeDialysisHypotensionRateV13 / computeDialysisAccessInfectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 血液透析管理记录 */
export interface DialysisMgmtRecordV13 {
  ktvQualified: number;
  dialysisTotal: number;
  hypotension: number;
  dialysisCaseTotal: number;
  infection: number;
  accessTotal: number;
}

/**
 * 透析充分性 KtV 合格率（纯函数）：KtV 达标人数/透析总人数×100，保留 2 位小数。
 *
 * @param records 血液透析管理记录列表
 * @returns 透析充分性 KtV 合格率百分比
 */
export function computeDialysisKtvPassRateV13(records: DialysisMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dialysisTotal, 0);
  if (total === 0) return 0;
  const ktvQualified = records.reduce((acc, r) => acc + r.ktvQualified, 0);
  return Math.round((ktvQualified / total) * 10000) / 100;
}

/**
 * 透析低血压发生率（纯函数，反向指标，值越低越好）：低血压例数/透析总例数×100，保留 2 位小数。
 *
 * @param records 血液透析管理记录列表
 * @returns 透析低血压发生率百分比
 */
export function computeDialysisHypotensionRateV13(records: DialysisMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dialysisCaseTotal, 0);
  if (total === 0) return 0;
  const hypotension = records.reduce((acc, r) => acc + r.hypotension, 0);
  return Math.round((hypotension / total) * 10000) / 100;
}

/**
 * 透析通路感染率（纯函数，反向指标，值越低越好）：感染例数/透析通路总数×100，保留 2 位小数。
 *
 * @param records 血液透析管理记录列表
 * @returns 透析通路感染率百分比
 */
export function computeDialysisAccessInfectionRateV13(records: DialysisMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.accessTotal, 0);
  if (total === 0) return 0;
  const infection = records.reduce((acc, r) => acc + r.infection, 0);
  return Math.round((infection / total) * 10000) / 100;
}
