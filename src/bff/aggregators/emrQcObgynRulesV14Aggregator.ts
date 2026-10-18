/**
 * 健澜科技 jlmedaios - 质控妇产科专科规则 V14 聚合器（M509-D，M509 收官）
 *
 * 纯函数：构建妇产科质控规则列表 + 检查妇产科病历 + 构建妇产科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 妇产科病历检查入参 */
export interface ObgynRecordV14 {
  hasPrenatalCheck: boolean;
  hasDeliveryNote: boolean;
  hasPostpartumNote: boolean;
}

/** 妇产科检查结果 */
export interface ObgynCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 妇产科质控报告 */
export interface ObgynReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建妇产科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildObgynRules(): { rules: string[] } {
  // 手算规则列表：3 条以上妇产科规则
  return {
    rules: [
      "产前检查必须按孕周记录",
      "分娩记录必须包含产程时间和方式",
      "产后观察必须记录恶露和子宫复旧",
      "孕期高危评分必须动态更新",
    ],
  };
}

/**
 * 检查妇产科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 妇产科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkObgyn(record: ObgynRecordV14): ObgynCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasPrenatalCheck) {
    defects.push("缺产前检查记录");
  }
  if (!record.hasDeliveryNote) {
    defects.push("缺分娩记录");
  }
  if (!record.hasPostpartumNote) {
    defects.push("缺产后记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建妇产科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildObgynReport(result: ObgynCheckResultV14): ObgynReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
