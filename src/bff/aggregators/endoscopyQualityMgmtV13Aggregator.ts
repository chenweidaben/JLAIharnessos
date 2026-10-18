/**
 * 健澜科技 jlmedaios - 内镜质量管理 V13 纯函数（M429-B，-quality 后缀避让旧版 endoscopyMgmtV13（M417））
 *
 * computeEndoscopyCleanDisinfectionPassRateV13 / computeEndoscopyComplicationRateV13 / computeEndoscopyMissRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 内镜质量管理记录 */
export interface EndoscopyQualityMgmtRecordV13 {
  cleanPass: number;
  endoTotal: number;
  complication: number;
  miss: number;
  endoProcedureTotal: number;
}

/**
 * 内镜清洗消毒合格率（纯函数）：合格清洗消毒内镜数/内镜总数×100，保留 2 位小数。
 *
 * @param records 内镜质量管理记录列表
 * @returns 内镜清洗消毒合格率百分比
 */
export function computeEndoscopyCleanDisinfectionPassRateV13(records: EndoscopyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.endoTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.cleanPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 内镜诊疗并发症率（纯函数，百分率%，反向指标，值越低越好）：发生并发症数/内镜诊疗总数×100，保留 2 位小数。
 *
 * @param records 内镜质量管理记录列表
 * @returns 内镜诊疗并发症率百分比
 */
export function computeEndoscopyComplicationRateV13(records: EndoscopyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.endoProcedureTotal, 0);
  if (total === 0) return 0;
  const complication = records.reduce((acc, r) => acc + r.complication, 0);
  return Math.round((complication / total) * 10000) / 100;
}

/**
 * 内镜漏诊率（纯函数，百分率%，反向指标，值越低越好）：漏诊数/内镜诊疗总数×100，保留 2 位小数。
 *
 * @param records 内镜质量管理记录列表
 * @returns 内镜漏诊率百分比
 */
export function computeEndoscopyMissRateV13(records: EndoscopyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.endoProcedureTotal, 0);
  if (total === 0) return 0;
  const miss = records.reduce((acc, r) => acc + r.miss, 0);
  return Math.round((miss / total) * 10000) / 100;
}
