/**
 * 健澜科技 jlmedaios - 质控中医科专科规则 V14 聚合器（M510-C）
 *
 * 纯函数：构建中医科质控规则列表 + 检查中医科病历 + 构建中医科质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 中医科病历检查入参 */
export interface TcmRecordV14 {
  hasSyndromeDifferentiation: boolean;
  hasPrescription: boolean;
  hasAcupunctureRecord: boolean;
}

/** 中医科检查结果 */
export interface TcmCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 中医科质控报告 */
export interface TcmReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建中医科质控规则列表。
 *
 * @returns 规则列表
 */
export function buildTcmRules(): { rules: string[] } {
  // 手算规则列表：3 条以上中医科规则
  return {
    rules: [
      "必须有辨证论治记录",
      "中药处方必须包含君臣佐使",
      "针灸推拿记录必须详细",
      "中医四诊信息必须完整",
    ],
  };
}

/**
 * 检查中医科病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 中医科病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkTcm(record: TcmRecordV14): TcmCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasSyndromeDifferentiation) {
    defects.push("缺辨证记录");
  }
  if (!record.hasPrescription) {
    defects.push("缺处方记录");
  }
  if (!record.hasAcupunctureRecord) {
    defects.push("缺针灸记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建中医科质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildTcmReport(result: TcmCheckResultV14): TcmReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
