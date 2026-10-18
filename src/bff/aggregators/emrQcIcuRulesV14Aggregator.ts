/**
 * 健澜科技 jlmedaios - 质控重症医学科(ICU)专科规则 V14 聚合器（M510-B）
 *
 * 纯函数：构建 ICU 质控规则列表 + 检查 ICU 病历 + 构建 ICU 质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ICU 病历检查入参 */
export interface IcuRecordV14 {
  hasDailyNote: boolean;
  hasVitalSigns: boolean;
  hasCarePlan: boolean;
}

/** ICU 检查结果 */
export interface IcuCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** ICU 质控报告 */
export interface IcuReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建 ICU 质控规则列表。
 *
 * @returns 规则列表
 */
export function buildIcuRules(): { rules: string[] } {
  // 手算规则列表：3 条以上 ICU 规则
  return {
    rules: [
      "每日必须有病程记录",
      "生命体征必须每小时记录",
      "护理计划必须每日更新",
      "转入转出记录必须完整",
    ],
  };
}

/**
 * 检查 ICU 病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record ICU 病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkIcu(record: IcuRecordV14): IcuCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasDailyNote) {
    defects.push("缺病程记录");
  }
  if (!record.hasVitalSigns) {
    defects.push("缺生命体征记录");
  }
  if (!record.hasCarePlan) {
    defects.push("缺护理计划");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建 ICU 质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildIcuReport(result: IcuCheckResultV14): IcuReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
