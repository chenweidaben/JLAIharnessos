/**
 * 健澜科技 jlmedaios - 质控外科专科规则 V14 聚合器（M509-B）
 *
 * 纯函数：构建外科质控规则列表 + 检查外科病历 + 构建外科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 外科病历检查入参 */
export interface SurgeryRecordV14 {
  hasOperativeNote: boolean;
  hasAnesthesiaRecord: boolean;
  hasPostOpRecord: boolean;
}

/** 外科检查结果 */
export interface SurgeryCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 外科质控报告 */
export interface SurgeryReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建外科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildSurgeryRules(): { rules: string[] } {
  // 手算规则列表：3 条以上外科规则
  return {
    rules: [
      "手术记录必须包含手术名称、术者、麻醉方式",
      "麻醉记录必须记录用药剂量和生命体征",
      "术后记录必须包含病情观察和处置措施",
      "手术知情同意书必须签署完整",
    ],
  };
}

/**
 * 检查外科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 外科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkSurgery(record: SurgeryRecordV14): SurgeryCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasOperativeNote) {
    defects.push("缺手术记录");
  }
  if (!record.hasAnesthesiaRecord) {
    defects.push("缺麻醉记录");
  }
  if (!record.hasPostOpRecord) {
    defects.push("缺术后记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建外科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildSurgeryReport(result: SurgeryCheckResultV14): SurgeryReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
