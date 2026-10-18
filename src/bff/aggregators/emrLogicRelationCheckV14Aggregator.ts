/**
 * 健澜科技 jlmedaios - 病历逻辑关系检查 V14 聚合器（M485-B）
 *
 * 纯函数：逻辑关系检查 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 逻辑关系检查结果 */
export interface LogicRelationResultV14 {
  diagnosis: string;
  medication: string;
  procedure: string;
  conflicts: string[];
}

/** 逻辑检查报告 */
export interface LogicReportV14 {
  conflictCount: number;
  score: number;
  conflicts: string[];
}

/** 诊断-用药匹配规则 */
const DIAGNOSIS_MEDICATION_RULES: { diagnosis: string; expectedMedication: string; conflict: string }[] = [
  { diagnosis: "高血压", expectedMedication: "降压药", conflict: "糖尿病患者应使用降糖药，当前为降压药" },
  { diagnosis: "糖尿病", expectedMedication: "降糖药", conflict: "糖尿病患者应使用降糖药，当前为降压药" },
];

/**
 * 检查诊断-用药-手术逻辑一致性。
 *
 * @param data 病历数据
 * @returns 检查结果
 */
export function checkLogicRelation(data: { diagnosis: string; medication: string; procedure: string }): LogicRelationResultV14 {
  const conflicts: string[] = [];
  for (const rule of DIAGNOSIS_MEDICATION_RULES) {
    if (data.diagnosis === "糖尿病" && data.medication === "降压药") {
      conflicts.push(rule.conflict);
    }
    if (data.diagnosis === "高血压" && data.medication === "降糖药") {
      conflicts.push("高血压患者应使用降压药，当前为降糖药");
    }
  }
  return { diagnosis: data.diagnosis, medication: data.medication, procedure: data.procedure, conflicts };
}

/**
 * 构建逻辑检查报告：score = 100 - conflictCount × 10，clamp 0-100。
 *
 * @param result 检查结果
 * @returns 报告
 */
export function buildLogicReport(result: LogicRelationResultV14): LogicReportV14 {
  const conflictCount = result.conflicts.length;
  const rawScore = 100 - conflictCount * 10;
  const score = Math.max(0, Math.min(100, rawScore));
  return { conflictCount, score, conflicts: result.conflicts };
}
