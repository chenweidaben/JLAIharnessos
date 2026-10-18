/**
 * 健澜科技 jlmedaios - 质控-营养风险筛查联动 V14 聚合器（M517-D，M517 收官）
 *
 * 纯函数：构建质控-营养筛查联动数据 + 检查营养筛查一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-营养筛查联动数据 */
export interface NutritionScreenLinkV14 {
  recordId: string;
  nrs2002Score: number;
  riskLevel: string;
}

/** 营养筛查一致性检查入参 */
export interface NutritionScreenConsistencyRecordV14 {
  hasScreening: boolean;
  hasAssessment: boolean;
  hasNutritionPlan: boolean;
}

/** 营养筛查一致性检查结果 */
export interface NutritionScreenConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 营养筛查联动报告 */
export interface NutritionScreenLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-营养筛查联动数据。
 *
 * @param recordId 病历记录ID
 * @param nrs2002Score NRS2002评分
 * @param riskLevel 风险等级
 * @returns 联动数据
 */
export function buildNutritionScreenLink(recordId: string, nrs2002Score: number, riskLevel: string): NutritionScreenLinkV14 {
  return { recordId, nrs2002Score, riskLevel };
}

/**
 * 检查营养筛查一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 营养筛查一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkNutritionScreenConsistency(record: NutritionScreenConsistencyRecordV14): NutritionScreenConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasScreening) {
    defects.push("缺营养风险筛查记录");
  }
  if (!record.hasAssessment) {
    defects.push("缺营养评估记录");
  }
  if (!record.hasNutritionPlan) {
    defects.push("缺营养支持计划");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建营养筛查联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildNutritionScreenLinkReport(result: NutritionScreenConsistencyResultV14): NutritionScreenLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
