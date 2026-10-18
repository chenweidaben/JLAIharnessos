/**
 * 健澜科技 jlmedaios - 质控-疼痛评估联动 V14 聚合器（M517-B）
 *
 * 纯函数：构建质控-疼痛评估联动数据 + 检查疼痛评估一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-疼痛评估联动数据 */
export interface PainAssessmentLinkV14 {
  recordId: string;
  painScore: number;
  painLevel: string;
}

/** 疼痛评估一致性检查入参 */
export interface PainAssessmentConsistencyRecordV14 {
  hasInitial: boolean;
  hasReassessment: boolean;
  hasIntervention: boolean;
}

/** 疼痛评估一致性检查结果 */
export interface PainAssessmentConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 疼痛评估联动报告 */
export interface PainAssessmentLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-疼痛评估联动数据。
 *
 * @param recordId 病历记录ID
 * @param painScore 疼痛评分（0-10）
 * @param painLevel 疼痛等级
 * @returns 联动数据
 */
export function buildPainAssessmentLink(recordId: string, painScore: number, painLevel: string): PainAssessmentLinkV14 {
  return { recordId, painScore, painLevel };
}

/**
 * 检查疼痛评估一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 疼痛评估一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkPainAssessmentConsistency(record: PainAssessmentConsistencyRecordV14): PainAssessmentConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasInitial) {
    defects.push("缺初始疼痛评估记录");
  }
  if (!record.hasReassessment) {
    defects.push("缺复评记录");
  }
  if (!record.hasIntervention) {
    defects.push("缺干预记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建疼痛评估联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildPainAssessmentLinkReport(result: PainAssessmentConsistencyResultV14): PainAssessmentLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
