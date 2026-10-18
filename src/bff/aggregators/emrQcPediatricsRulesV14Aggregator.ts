/**
 * 健澜科技 jlmedaios - 质控儿科专科规则 V14 聚合器（M509-C）
 *
 * 纯函数：构建儿科质控规则列表 + 检查儿科病历 + 构建儿科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 儿科病历检查入参 */
export interface PediatricsRecordV14 {
  hasGrowthChart: boolean;
  hasVaccinationRecord: boolean;
  hasDevelopmentNote: boolean;
}

/** 儿科检查结果 */
export interface PediatricsCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 儿科质控报告 */
export interface PediatricsReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建儿科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildPediatricsRules(): { rules: string[] } {
  // 手算规则列表：3 条以上儿科规则
  return {
    rules: [
      "必须附生长发育曲线图",
      "疫苗接种记录必须完整",
      "心理发育评估必须定期记录",
      "用药剂量必须按体重计算",
    ],
  };
}

/**
 * 检查儿科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 儿科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkPediatrics(record: PediatricsRecordV14): PediatricsCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasGrowthChart) {
    defects.push("缺生长发育曲线");
  }
  if (!record.hasVaccinationRecord) {
    defects.push("缺疫苗接种记录");
  }
  if (!record.hasDevelopmentNote) {
    defects.push("缺发育评估记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建儿科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildPediatricsReport(result: PediatricsCheckResultV14): PediatricsReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
