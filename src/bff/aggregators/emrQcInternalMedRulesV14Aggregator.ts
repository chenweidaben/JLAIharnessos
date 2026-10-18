/**
 * 健澜科技 jlmedaios - 质控内科专科规则 V14 聚合器（M509-A）
 *
 * 纯函数：构建内科质控规则列表 + 检查内科病历 + 构建内科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 内科病历检查入参 */
export interface InternalMedRecordV14 {
  hasChiefComplaint: boolean;
  hasDiagnosis: boolean;
  hasMedication: boolean;
}

/** 内科检查结果 */
export interface InternalMedCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 内科质控报告 */
export interface InternalMedReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建内科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildInternalMedRules(): { rules: string[] } {
  // 手算规则列表：3 条以上内科规则
  return {
    rules: [
      "主诉必须简明扼要，不超过20字",
      "诊断必须明确，包含病因和病理生理",
      "用药记录必须包含药名、剂量、用法",
      "现病史按时间顺序描述",
    ],
  };
}

/**
 * 检查内科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 内科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkInternalMed(record: InternalMedRecordV14): InternalMedCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasChiefComplaint) {
    defects.push("缺主诉");
  }
  if (!record.hasDiagnosis) {
    defects.push("缺诊断");
  }
  if (!record.hasMedication) {
    defects.push("缺用药记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建内科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildInternalMedReport(result: InternalMedCheckResultV14): InternalMedReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
