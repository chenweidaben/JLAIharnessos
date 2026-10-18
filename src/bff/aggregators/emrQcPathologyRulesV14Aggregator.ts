/**
 * 健澜科技 jlmedaios - 质控病理科专科规则 V14 聚合器（M512-B）
 *
 * 纯函数：构建病理科质控规则列表 + 检查病理科病历 + 构建病理科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病理科病历检查入参 */
export interface PathologyRecordV14 {
  hasSpecimenLabel: boolean;
  hasReport: boolean;
  hasDiagnosis: boolean;
}

/** 病理科检查结果 */
export interface PathologyCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 病理科质控报告 */
export interface PathologyReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建病理科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildPathologyRules(): { rules: string[] } {
  // 手算规则列表：3 条以上病理科规则
  return {
    rules: [
      "标本必须有标签",
      "病理报告必须及时",
      "诊断结论必须明确",
      "标本送检必须核对",
    ],
  };
}

/**
 * 检查病理科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 病理科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkPathology(record: PathologyRecordV14): PathologyCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasSpecimenLabel) {
    defects.push("缺标本标签");
  }
  if (!record.hasReport) {
    defects.push("缺病理报告");
  }
  if (!record.hasDiagnosis) {
    defects.push("缺诊断结论");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建病理科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildPathologyReport(result: PathologyCheckResultV14): PathologyReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
