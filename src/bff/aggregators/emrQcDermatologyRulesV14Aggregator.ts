/**
 * 健澜科技 jlmedaios - 质控皮肤科专科规则 V14 聚合器（M511-A）
 *
 * 纯函数：构建皮肤科质控规则列表 + 检查皮肤科病历 + 构建皮肤科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 皮肤科病历检查入参 */
export interface DermatologyRecordV14 {
  hasLesionDescription: boolean;
  hasPhotoDocument: boolean;
  hasTreatmentPlan: boolean;
}

/** 皮肤科检查结果 */
export interface DermatologyCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 皮肤科质控报告 */
export interface DermatologyReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建皮肤科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildDermatologyRules(): { rules: string[] } {
  // 手算规则列表：3 条以上皮肤科规则
  return {
    rules: [
      "必须有皮损描述（部位/形态/颜色）",
      "重要皮损必须有照片记录",
      "治疗方案必须个性化",
      "随访计划必须明确",
    ],
  };
}

/**
 * 检查皮肤科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 皮肤科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkDermatology(record: DermatologyRecordV14): DermatologyCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasLesionDescription) {
    defects.push("缺皮损描述");
  }
  if (!record.hasPhotoDocument) {
    defects.push("缺照片记录");
  }
  if (!record.hasTreatmentPlan) {
    defects.push("缺治疗计划");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建皮肤科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildDermatologyReport(result: DermatologyCheckResultV14): DermatologyReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
