/**
 * 健澜科技 jlmedaios - 病房质量管理 V13 纯函数（M429-D，M429 收官，-quality 后缀避让旧版 wardMgmtDetailV13（M417））
 *
 * computeWardNursingPassRateV13 / computeWardHealthEducationCoverageRateV13 / computeWardPatientSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病房质量管理记录 */
export interface WardQualityMgmtRecordV13 {
  nursingPass: number;
  nursingTotal: number;
  eduCovered: number;
  inpatientTotal: number;
  satisfied: number;
  surveyedTotal: number;
}

/**
 * 病房护理合格率（纯函数）：合格护理项数/护理检查项总数×100，保留 2 位小数。
 *
 * @param records 病房质量管理记录列表
 * @returns 病房护理合格率百分比
 */
export function computeWardNursingPassRateV13(records: WardQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.nursingTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.nursingPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 病房健康教育覆盖率（纯函数）：覆盖患者数/住院患者总数×100，保留 2 位小数。
 *
 * @param records 病房质量管理记录列表
 * @returns 病房健康教育覆盖率百分比
 */
export function computeWardHealthEducationCoverageRateV13(records: WardQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotal, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.eduCovered, 0);
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * 病房患者满意度（纯函数）：满意患者数/调查患者总数×100，保留 2 位小数。
 *
 * @param records 病房质量管理记录列表
 * @returns 病房患者满意度百分比
 */
export function computeWardPatientSatisfactionRateV13(records: WardQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedTotal, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}
