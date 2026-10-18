/**
 * 健澜科技 jlmedaios - 质控急诊专科规则 V14 聚合器（M510-A）
 *
 * 纯函数：构建急诊质控规则列表 + 检查急诊病历 + 构建急诊质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急诊病历检查入参 */
export interface EmergencyRecordV14 {
  hasTriage: boolean;
  hasRescueRecord: boolean;
  hasTimeStamp: boolean;
}

/** 急诊检查结果 */
export interface EmergencyCheckResultV14 {
  pass: boolean;
  defects: string[];
}

/** 急诊质控报告 */
export interface EmergencyReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建急诊质控规则列表。
 *
 * @returns 规则列表
 */
export function buildEmergencyRules(): { rules: string[] } {
  // 手算规则列表：3 条以上急诊规则
  return {
    rules: [
      "必须有分诊记录（预检分诊）",
      "抢救记录必须详细完整",
      "所有时间戳必须精确到分钟",
      "绿色通道标识必须明确",
    ],
  };
}

/**
 * 检查急诊病历（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 急诊病历入参
 * @returns 检查结果（pass + defects）
 */
export function checkEmergency(record: EmergencyRecordV14): EmergencyCheckResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasTriage) {
    defects.push("缺分诊记录");
  }
  if (!record.hasRescueRecord) {
    defects.push("缺抢救记录");
  }
  if (!record.hasTimeStamp) {
    defects.push("缺时间戳");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建急诊质控报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildEmergencyReport(result: EmergencyCheckResultV14): EmergencyReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
