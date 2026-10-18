/**
 * 健澜科技 jlmedaios - 质控疼痛科专科规则 V14 聚合器（M512-D，M512 收官）
 *
 * 纯函数：构建疼痛科质控规则列表 + 检查疼痛科病历 + 构建疼痛科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 疼痛科病历检查入参 */
export interface PainRecordV14 {
  hasPainScore: boolean;
  hasTreatmentPlan: boolean;
  hasFollowUp: boolean;
}

/** 疼痛科检查结果 */
export interface PainCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 疼痛科质控报告 */
export interface PainReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建疼痛科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildPainRules(): { rules: string[] } {
  // 手算规则列表：3 条以上疼痛科规则
  return {
    rules: [
      "必须有疼痛评分",
      "治疗方案必须个性化",
      "疼痛随访必须记录",
      "镇痛药物使用必须规范",
    ],
  };
}

/**
 * 检查疼痛科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 疼痛科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkPain(record: PainRecordV14): PainCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasPainScore) {
    defects.push("缺疼痛评分");
  }
  if (!record.hasTreatmentPlan) {
    defects.push("缺治疗计划");
  }
  if (!record.hasFollowUp) {
    defects.push("缺随访记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建疼痛科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildPainReport(result: PainCheckResultV14): PainReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
