/**
 * 健澜科技 jlmedaios - 质控营养科专科规则 V14 聚合器（M512-C）
 *
 * 纯函数：构建营养科质控规则列表 + 检查营养科病历 + 构建营养科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 营养科病历检查入参 */
export interface NutritionRecordV14 {
  hasNutritionAssessment: boolean;
  hasDietOrder: boolean;
  hasFollowUp: boolean;
}

/** 营养科检查结果 */
export interface NutritionCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 营养科质控报告 */
export interface NutritionReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建营养科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildNutritionRules(): { rules: string[] } {
  // 手算规则列表：3 条以上营养科规则
  return {
    rules: [
      "必须有营养评估",
      "饮食医嘱必须明确",
      "营养随访必须记录",
      "营养支持必须有依据",
    ],
  };
}

/**
 * 检查营养科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 营养科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkNutrition(record: NutritionRecordV14): NutritionCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasNutritionAssessment) {
    defects.push("缺营养评估");
  }
  if (!record.hasDietOrder) {
    defects.push("缺饮食医嘱");
  }
  if (!record.hasFollowUp) {
    defects.push("缺营养随访");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建营养科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildNutritionReport(result: NutritionCheckResultV14): NutritionReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
