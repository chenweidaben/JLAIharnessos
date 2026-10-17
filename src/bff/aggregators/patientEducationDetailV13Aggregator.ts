/**
 * 健澜科技 jlmedaios - 患者教育明细 V13 纯函数（M400-D，M400 收官，避让旧版 patientEducationV13）
 *
 * computeHealthEducationSessionCountV13 / computeEducationMaterialDistributionCountV13 / computePatientHealthKnowledgeAwarenessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者教育明细记录 */
export interface PatientEducationDetailRecordV13 {
  sessionCount: number;
  materialCount: number;
  awareCount: number;
  totalCount: number;
}

/**
 * 健康宣教场次（纯函数）：求和。
 *
 * @param records 患者教育明细记录列表
 * @returns 健康宣教场次
 */
export function computeHealthEducationSessionCountV13(records: PatientEducationDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.sessionCount, 0);
}

/**
 * 宣教材料发放数（纯函数）：求和。
 *
 * @param records 患者教育明细记录列表
 * @returns 宣教材料发放数
 */
export function computeEducationMaterialDistributionCountV13(records: PatientEducationDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.materialCount, 0);
}

/**
 * 患者健康知识知晓率（纯函数）：知晓人数/调查总人数×100，保留 2 位小数。
 *
 * @param records 患者教育明细记录列表
 * @returns 患者健康知识知晓率百分比
 */
export function computePatientHealthKnowledgeAwarenessRateV13(records: PatientEducationDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const aware = records.reduce((acc, r) => acc + r.awareCount, 0);
  return Math.round((aware / total) * 10000) / 100;
}
