/**
 * 健澜科技 jlmedaios - 护理服务明细 V13 纯函数（M405-D，M405 收官）
 *
 * computeHighQualityNursingServiceCoverageRateV13 / computeResponsibilityHolisticNursingCoverageRateV13 / computeNursingAssistantCertifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理服务明细记录 */
export interface NursingServiceDetailRecordV13 {
  qualityCovered: number;
  qualityShould: number;
  respCovered: number;
  respShould: number;
  certified: number;
  totalAssistant: number;
}

/**
 * 优质护理服务覆盖率（纯函数）：已覆盖病区数/应覆盖病区数×100，保留 2 位小数。
 *
 * @param records 护理服务明细记录列表
 * @returns 优质护理服务覆盖率百分比
 */
export function computeHighQualityNursingServiceCoverageRateV13(records: NursingServiceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.qualityShould, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.qualityCovered, 0);
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * 责任制整体护理覆盖率（纯函数）：已覆盖病区数/应覆盖病区数×100，保留 2 位小数。
 *
 * @param records 护理服务明细记录列表
 * @returns 责任制整体护理覆盖率百分比
 */
export function computeResponsibilityHolisticNursingCoverageRateV13(records: NursingServiceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.respShould, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.respCovered, 0);
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * 护理员持证上岗率（纯函数）：持证人数/护理员总数×100，保留 2 位小数。
 *
 * @param records 护理服务明细记录列表
 * @returns 护理员持证上岗率百分比
 */
export function computeNursingAssistantCertifiedRateV13(records: NursingServiceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAssistant, 0);
  if (total === 0) return 0;
  const certified = records.reduce((acc, r) => acc + r.certified, 0);
  return Math.round((certified / total) * 10000) / 100;
}
