/**
 * 健澜科技 jlmedaios - 质控-VTE预防联动 V14 聚合器（M515-B）
 *
 * 纯函数：构建质控-VTE联动数据 + 检查VTE一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-VTE联动数据 */
export interface VteLinkV14 {
  recordId: string;
  riskLevel: string;
  preventionMeasures: string[];
}

/** VTE一致性检查入参 */
export interface VteConsistencyRecordV14 {
  hasAssessment: boolean;
  hasPrevention: boolean;
  hasEducation: boolean;
}

/** VTE一致性检查结果 */
export interface VteConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** VTE联动报告 */
export interface VteLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-VTE联动数据。
 *
 * @param recordId 病历记录ID
 * @param riskLevel 风险等级
 * @param preventionMeasures 预防措施列表
 * @returns 联动数据
 */
export function buildVteLink(recordId: string, riskLevel: string, preventionMeasures: string[]): VteLinkV14 {
  return { recordId, riskLevel, preventionMeasures };
}

/**
 * 检查VTE一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record VTE一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkVteConsistency(record: VteConsistencyRecordV14): VteConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasAssessment) {
    defects.push("缺VTE风险评估记录");
  }
  if (!record.hasPrevention) {
    defects.push("缺预防措施记录");
  }
  if (!record.hasEducation) {
    defects.push("缺健康教育记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建VTE联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildVteLinkReport(result: VteConsistencyResultV14): VteLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
