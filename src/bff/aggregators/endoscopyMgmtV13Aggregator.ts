/**
 * 健澜科技 jlmedaios - 内镜管理 V13 纯函数（M417-B）
 *
 * computeEndoscopyCleaningDisinfectionPassRateV13 / computeEndoscopyPathologyMatchRateV13 / computeEndoscopyTreatmentComplicationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 内镜管理记录 */
export interface EndoscopyMgmtRecordV13 {
  cleaningQualified: number;
  cleaningTotal: number;
  pathologyMatch: number;
  endoscopyDiagnosisTotal: number;
  complication: number;
  treatmentTotal: number;
}

/**
 * 内镜清洗消毒合格率（纯函数）：合格内镜数/清洗消毒内镜总数×100，保留 2 位小数。
 *
 * @param records 内镜管理记录列表
 * @returns 内镜清洗消毒合格率百分比
 */
export function computeEndoscopyCleaningDisinfectionPassRateV13(records: EndoscopyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.cleaningTotal, 0);
  if (total === 0) return 0;
  const cleaningQualified = records.reduce((acc, r) => acc + r.cleaningQualified, 0);
  return Math.round((cleaningQualified / total) * 10000) / 100;
}

/**
 * 内镜诊断与病理符合率（纯函数）：符合份数/内镜诊断总数×100，保留 2 位小数。
 *
 * @param records 内镜管理记录列表
 * @returns 内镜诊断与病理符合率百分比
 */
export function computeEndoscopyPathologyMatchRateV13(records: EndoscopyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.endoscopyDiagnosisTotal, 0);
  if (total === 0) return 0;
  const pathologyMatch = records.reduce((acc, r) => acc + r.pathologyMatch, 0);
  return Math.round((pathologyMatch / total) * 10000) / 100;
}

/**
 * 内镜治疗并发症率（纯函数，反向指标，值越低越好）：并发症例数/内镜治疗总数×100，保留 2 位小数。
 *
 * @param records 内镜管理记录列表
 * @returns 内镜治疗并发症率百分比
 */
export function computeEndoscopyTreatmentComplicationRateV13(records: EndoscopyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.treatmentTotal, 0);
  if (total === 0) return 0;
  const complication = records.reduce((acc, r) => acc + r.complication, 0);
  return Math.round((complication / total) * 10000) / 100;
}
