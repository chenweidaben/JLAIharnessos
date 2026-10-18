/**
 * 健澜科技 jlmedaios - 质控耳鼻喉科专科规则 V14 聚合器（M511-D，M511 收官）
 *
 * 纯函数：构建耳鼻喉科质控规则列表 + 检查耳鼻喉科病历 + 构建耳鼻喉科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 耳鼻喉科病历检查入参 */
export interface EntRecordV14 {
  hasEarExam: boolean;
  hasNoseExam: boolean;
  hasThroatExam: boolean;
}

/** 耳鼻喉科检查结果 */
export interface EntCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 耳鼻喉科质控报告 */
export interface EntReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建耳鼻喉科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildEntRules(): { rules: string[] } {
  // 手算规则列表：3 条以上耳鼻喉科规则
  return {
    rules: [
      "必须有耳部检查记录",
      "必须有鼻部检查记录",
      "必须有咽喉部检查记录",
      "听力筛查必须记录",
    ],
  };
}

/**
 * 检查耳鼻喉科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 耳鼻喉科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkEnt(record: EntRecordV14): EntCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasEarExam) {
    defects.push("缺耳部检查");
  }
  if (!record.hasNoseExam) {
    defects.push("缺鼻部检查");
  }
  if (!record.hasThroatExam) {
    defects.push("缺咽喉检查");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建耳鼻喉科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildEntReport(result: EntCheckResultV14): EntReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
