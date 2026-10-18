/**
 * 健澜科技 jlmedaios - 质控康复科专科规则 V14 聚合器（M510-D，M510 收官）
 *
 * 纯函数：构建康复科质控规则列表 + 检查康复科病历 + 构建康复科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 康复科病历检查入参 */
export interface RehabRecordV14 {
  hasAssessment: boolean;
  hasTreatmentPlan: boolean;
  hasProgressNote: boolean;
}

/** 康复科检查结果 */
export interface RehabCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 康复科质控报告 */
export interface RehabReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建康复科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildRehabRules(): { rules: string[] } {
  // 手算规则列表：3 条以上康复科规则
  return {
    rules: [
      "必须有康复功能评估",
      "治疗计划必须个性化",
      "康复进展必须定期记录",
      "出院指导必须包含康复方案",
    ],
  };
}

/**
 * 检查康复科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 康复科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkRehab(record: RehabRecordV14): RehabCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasAssessment) {
    defects.push("缺康复评估");
  }
  if (!record.hasTreatmentPlan) {
    defects.push("缺治疗计划");
  }
  if (!record.hasProgressNote) {
    defects.push("缺进展记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建康复科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildRehabReport(result: RehabCheckResultV14): RehabReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
