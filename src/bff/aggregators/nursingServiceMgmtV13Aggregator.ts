/**
 * 健澜科技 jlmedaios - 护理服务管理 V13 纯函数（M453-D，M453 收官，护理管理组）
 *
 * computeNursingBasicCareQualifiedRateV13 / computeNursingClassifiedCareImplementationRateV13 / computeNursingSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理服务管理记录 */
export interface NursingServiceMgmtRecordV13 {
  qualified: number;
  totalCheck: number;
  inPlace: number;
  totalClassified: number;
  satisfied: number;
  totalSurvey: number;
}

/**
 * 基础护理合格率（纯函数）：合格基础护理项数/基础护理检查项总数×100，保留 2 位小数。
 *
 * @param records 护理服务管理记录列表
 * @returns 基础护理合格率百分比
 */
export function computeNursingBasicCareQualifiedRateV13(records: NursingServiceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCheck, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 分级护理到位率（纯函数）：到位分级护理数/分级护理总数×100，保留 2 位小数。
 *
 * @param records 护理服务管理记录列表
 * @returns 分级护理到位率百分比
 */
export function computeNursingClassifiedCareImplementationRateV13(records: NursingServiceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalClassified, 0);
  if (total === 0) return 0;
  const inPlace = records.reduce((acc, r) => acc + r.inPlace, 0);
  return Math.round((inPlace / total) * 10000) / 100;
}

/**
 * 护理满意度（纯函数）：护理满意人次/护理调查总人次×100，保留 2 位小数。
 *
 * @param records 护理服务管理记录列表
 * @returns 护理满意度百分比
 */
export function computeNursingSatisfactionRateV13(records: NursingServiceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSurvey, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}
