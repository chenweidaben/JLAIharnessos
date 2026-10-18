/**
 * 健澜科技 jlmedaios - 质控麻醉科专科规则 V14 聚合器（M512-A）
 *
 * 纯函数：构建麻醉科质控规则列表 + 检查麻醉科病历 + 构建麻醉科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 麻醉科病历检查入参 */
export interface AnesthesiaRecordV14 {
  hasPreAnesthesiaEval: boolean;
  hasIntraAnesthesiaRecord: boolean;
  hasPostAnesthesiaNote: boolean;
}

/** 麻醉科检查结果 */
export interface AnesthesiaCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 麻醉科质控报告 */
export interface AnesthesiaReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建麻醉科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildAnesthesiaRules(): { rules: string[] } {
  // 手算规则列表：3 条以上麻醉科规则
  return {
    rules: [
      "必须有术前麻醉评估",
      "术中记录必须完整",
      "术后随访必须记录",
      "麻醉知情同意书必须签署",
    ],
  };
}

/**
 * 检查麻醉科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 麻醉科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkAnesthesia(record: AnesthesiaRecordV14): AnesthesiaCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasPreAnesthesiaEval) {
    defects.push("缺术前评估");
  }
  if (!record.hasIntraAnesthesiaRecord) {
    defects.push("缺术中记录");
  }
  if (!record.hasPostAnesthesiaNote) {
    defects.push("缺术后记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建麻醉科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildAnesthesiaReport(result: AnesthesiaCheckResultV14): AnesthesiaReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
