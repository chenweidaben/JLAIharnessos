/**
 * 健澜科技 jlmedaios - 质控-护理评估单联动 V14 聚合器（M517-A）
 *
 * 纯函数：构建质控-护理评估联动数据 + 检查护理评估一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-护理评估联动数据 */
export interface NursingAssessmentLinkV14 {
  recordId: string;
  nurse: string;
  assessmentType: string;
}

/** 护理评估一致性检查入参 */
export interface NursingAssessmentConsistencyRecordV14 {
  hasAdmission: boolean;
  hasPeriodic: boolean;
  hasDischarge: boolean;
}

/** 护理评估一致性检查结果 */
export interface NursingAssessmentConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 护理评估联动报告 */
export interface NursingAssessmentLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-护理评估联动数据。
 *
 * @param recordId 病历记录ID
 * @param nurse 责任护士
 * @param assessmentType 评估类型
 * @returns 联动数据
 */
export function buildNursingAssessmentLink(recordId: string, nurse: string, assessmentType: string): NursingAssessmentLinkV14 {
  return { recordId, nurse, assessmentType };
}

/**
 * 检查护理评估一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 护理评估一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkNursingAssessmentConsistency(record: NursingAssessmentConsistencyRecordV14): NursingAssessmentConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasAdmission) {
    defects.push("缺入院护理评估记录");
  }
  if (!record.hasPeriodic) {
    defects.push("缺定期评估记录");
  }
  if (!record.hasDischarge) {
    defects.push("缺出院护理评估记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建护理评估联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildNursingAssessmentLinkReport(result: NursingAssessmentConsistencyResultV14): NursingAssessmentLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
