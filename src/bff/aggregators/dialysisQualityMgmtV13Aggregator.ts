/**
 * 健澜科技 jlmedaios - 透析质量管理 V13 纯函数（M429-A，-quality 后缀避让旧版 dialysisMgmtV13（M417））
 *
 * computeDialysisAdequacyRateV13 / computeDialysisHypotensionOccurrenceRateV13 / computeDialysisAccessInfectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 透析质量管理记录 */
export interface DialysisQualityMgmtRecordV13 {
  adequate: number;
  dialysisTotal: number;
  hypotension: number;
  accessInfection: number;
  dialysisSessionTotal: number;
}

/**
 * 透析充分性达标率（纯函数）：达标患者数/透析患者总数×100，保留 2 位小数。
 *
 * @param records 透析质量管理记录列表
 * @returns 透析充分性达标率百分比
 */
export function computeDialysisAdequacyRateV13(records: DialysisQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dialysisTotal, 0);
  if (total === 0) return 0;
  const adequate = records.reduce((acc, r) => acc + r.adequate, 0);
  return Math.round((adequate / total) * 10000) / 100;
}

/**
 * 透析低血压发生率（纯函数，百分率%，反向指标，值越低越好）：发生低血压次数/透析总次数×100，保留 2 位小数。
 *
 * @param records 透析质量管理记录列表
 * @returns 透析低血压发生率百分比
 */
export function computeDialysisHypotensionOccurrenceRateV13(records: DialysisQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dialysisSessionTotal, 0);
  if (total === 0) return 0;
  const hypotension = records.reduce((acc, r) => acc + r.hypotension, 0);
  return Math.round((hypotension / total) * 10000) / 100;
}

/**
 * 透析通路感染率（纯函数，百分率%，反向指标，值越低越好）：发生感染次数/透析总次数×100，保留 2 位小数。
 *
 * @param records 透析质量管理记录列表
 * @returns 透析通路感染率百分比
 */
export function computeDialysisAccessInfectionRateV13(records: DialysisQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dialysisSessionTotal, 0);
  if (total === 0) return 0;
  const infection = records.reduce((acc, r) => acc + r.accessInfection, 0);
  return Math.round((infection / total) * 10000) / 100;
}
