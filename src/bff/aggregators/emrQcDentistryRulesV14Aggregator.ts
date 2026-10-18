/**
 * 健澜科技 jlmedaios - 质控口腔科专科规则 V14 聚合器（M511-C）
 *
 * 纯函数：构建口腔科质控规则列表 + 检查口腔科病历 + 构建口腔科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 口腔科病历检查入参 */
export interface DentistryRecordV14 {
  hasToothChart: boolean;
  hasXray: boolean;
  hasTreatmentPlan: boolean;
}

/** 口腔科检查结果 */
export interface DentistryCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 口腔科质控报告 */
export interface DentistryReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建口腔科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildDentistryRules(): { rules: string[] } {
  // 手算规则列表：3 条以上口腔科规则
  return {
    rules: [
      "必须有牙位图记录",
      "必要时必须有X光片",
      "治疗计划必须明确",
      "术前告知必须签署",
    ],
  };
}

/**
 * 检查口腔科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 口腔科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkDentistry(record: DentistryRecordV14): DentistryCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasToothChart) {
    defects.push("缺牙位图");
  }
  if (!record.hasXray) {
    defects.push("缺X光片");
  }
  if (!record.hasTreatmentPlan) {
    defects.push("缺治疗计划");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建口腔科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildDentistryReport(result: DentistryCheckResultV14): DentistryReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
