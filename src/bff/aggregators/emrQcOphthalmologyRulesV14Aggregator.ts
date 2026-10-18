/**
 * 健澜科技 jlmedaios - 质控眼科专科规则 V14 聚合器（M511-B）
 *
 * 纯函数：构建眼科质控规则列表 + 检查眼科病历 + 构建眼科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 眼科病历检查入参 */
export interface OphthalmologyRecordV14 {
  hasVisualAcuity: boolean;
  hasFundusExam: boolean;
  hasRefractionNote: boolean;
}

/** 眼科检查结果 */
export interface OphthalmologyCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 眼科质控报告 */
export interface OphthalmologyReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建眼科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildOphthalmologyRules(): { rules: string[] } {
  // 手算规则列表：3 条以上眼科规则
  return {
    rules: [
      "必须有视力记录（裸眼/矫正）",
      "眼底检查必须详细",
      "验光记录必须完整",
      "眼压测量必须记录",
    ],
  };
}

/**
 * 检查眼科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 眼科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkOphthalmology(record: OphthalmologyRecordV14): OphthalmologyCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasVisualAcuity) {
    defects.push("缺视力记录");
  }
  if (!record.hasFundusExam) {
    defects.push("缺眼底检查");
  }
  if (!record.hasRefractionNote) {
    defects.push("缺验光记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建眼科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildOphthalmologyReport(result: OphthalmologyCheckResultV14): OphthalmologyReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
