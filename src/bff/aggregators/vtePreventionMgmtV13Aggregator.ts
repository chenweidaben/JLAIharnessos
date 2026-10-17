/**
 * 健澜科技 jlmedaios - VTE 预防管理 V13 纯函数（M414-D，M414 收官）
 *
 * computeAdmissionVteRiskAssessmentRateV13 / computeVtePreventionMeasureImplementationRateV13 / computeInpatientVteOccurrenceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** VTE 预防管理记录 */
export interface VtePreventionMgmtRecordV13 {
  assessed: number;
  admissionTotal: number;
  implemented: number;
  shouldPreventTotal: number;
  occurred: number;
  inpatientTotal: number;
}

/**
 * 入院VTE风险评估率（纯函数）：已评估人数/入院总人数×100，保留 2 位小数。
 *
 * @param records VTE 预防管理记录列表
 * @returns 入院VTE风险评估率百分比
 */
export function computeAdmissionVteRiskAssessmentRateV13(records: VtePreventionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.admissionTotal, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessed, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 预防措施落实率（纯函数）：已落实预防措施人数/应预防人数×100，保留 2 位小数。
 *
 * @param records VTE 预防管理记录列表
 * @returns 预防措施落实率百分比
 */
export function computeVtePreventionMeasureImplementationRateV13(records: VtePreventionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldPreventTotal, 0);
  if (total === 0) return 0;
  const implemented = records.reduce((acc, r) => acc + r.implemented, 0);
  return Math.round((implemented / total) * 10000) / 100;
}

/**
 * 住院期间VTE发生率（纯函数，反向指标，值越低越好）：发生VTE例数/住院总例数×100，保留 2 位小数。
 *
 * @param records VTE 预防管理记录列表
 * @returns 住院期间VTE发生率百分比
 */
export function computeInpatientVteOccurrenceRateV13(records: VtePreventionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotal, 0);
  if (total === 0) return 0;
  const occurred = records.reduce((acc, r) => acc + r.occurred, 0);
  return Math.round((occurred / total) * 10000) / 100;
}
