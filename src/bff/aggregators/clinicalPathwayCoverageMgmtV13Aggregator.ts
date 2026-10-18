/**
 * 健澜科技 jlmedaios - 临床路径管理（覆盖率视角）V13 纯函数（M452-C，医院评审与临床质量改进组）
 *
 * 避让说明：基础名 clinicalPathwayMgmtV13 已被早期切片占用（含 clinicalPathwayDetailV13 detail 后缀），
 * 本切片改用 -coverage 维度后缀避让。
 *
 * computeClinicalPathwayCoverageEnrollmentRateV13 / computeClinicalPathwayCoverageCompletionRateV13 / computeClinicalPathwayCoverageVariationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床路径管理（覆盖率视角）记录 */
export interface ClinicalPathwayCoverageMgmtRecordV13 {
  enrolled: number;
  eligible: number;
  completed: number;
  enrolledTotal: number;
  variation: number;
}

/**
 * 临床路径入径率（纯函数）：入径患者数/符合路径条件患者总数×100，保留 2 位小数。
 *
 * @param records 临床路径管理（覆盖率视角）记录列表
 * @returns 临床路径入径率百分比
 */
export function computeClinicalPathwayCoverageEnrollmentRateV13(records: ClinicalPathwayCoverageMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.eligible, 0);
  if (total === 0) return 0;
  const enrolled = records.reduce((acc, r) => acc + r.enrolled, 0);
  return Math.round((enrolled / total) * 10000) / 100;
}

/**
 * 临床路径完成率（纯函数）：完成路径患者数/入径患者总数×100，保留 2 位小数。
 *
 * @param records 临床路径管理（覆盖率视角）记录列表
 * @returns 临床路径完成率百分比
 */
export function computeClinicalPathwayCoverageCompletionRateV13(records: ClinicalPathwayCoverageMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.enrolledTotal, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 临床路径变异率（纯函数，反向指标越低越好）：发生变异患者数/入径患者总数×100，保留 2 位小数。
 *
 * @param records 临床路径管理（覆盖率视角）记录列表
 * @returns 临床路径变异率百分比
 */
export function computeClinicalPathwayCoverageVariationRateV13(records: ClinicalPathwayCoverageMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.enrolledTotal, 0);
  if (total === 0) return 0;
  const variation = records.reduce((acc, r) => acc + r.variation, 0);
  return Math.round((variation / total) * 10000) / 100;
}
