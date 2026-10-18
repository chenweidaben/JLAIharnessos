/**
 * 健澜科技 jlmedaios - 单病种质量管理 V13 纯函数（M452-B，医院评审与临床质量改进组）
 *
 * computeSingleDiseaseReportRateV13 / computeSingleDiseaseControlIndicatorComplianceRateV13 / computeSingleDiseaseAverageLengthOfStayV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 单病种质量管理记录 */
export interface SingleDiseaseQualityMgmtRecordV13 {
  reported: number;
  shouldReport: number;
  qualified: number;
  totalIndicator: number;
  lengthOfStay: number;
}

/**
 * 单病种上报率（纯函数）：已上报单病种病例数/应上报单病种病例数×100，保留 2 位小数。
 *
 * @param records 单病种质量管理记录列表
 * @returns 单病种上报率百分比
 */
export function computeSingleDiseaseReportRateV13(records: SingleDiseaseQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldReport, 0);
  if (total === 0) return 0;
  const reported = records.reduce((acc, r) => acc + r.reported, 0);
  return Math.round((reported / total) * 10000) / 100;
}

/**
 * 单病种质量控制指标达标率（纯函数）：达标指标数/质控指标总数×100，保留 2 位小数。
 *
 * @param records 单病种质量管理记录列表
 * @returns 单病种质量控制指标达标率百分比
 */
export function computeSingleDiseaseControlIndicatorComplianceRateV13(records: SingleDiseaseQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalIndicator, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 单病种平均住院日（纯函数，Math.ceil 整天）：avg(lengthOfStay) 向上取整到整天。
 *
 * @param records 单病种质量管理记录列表
 * @returns 单病种平均住院日（整天）
 */
export function computeSingleDiseaseAverageLengthOfStayV13(records: SingleDiseaseQualityMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.lengthOfStay, 0);
  return Math.ceil(sum / records.length);
}
