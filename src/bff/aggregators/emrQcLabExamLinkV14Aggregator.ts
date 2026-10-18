/**
 * 健澜科技 jlmedaios - 质控-检验检查联动 V14 聚合器（M514-A）
 *
 * 纯函数：构建质控-检验检查联动数据 + 检查检验检查一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-检验检查联动数据 */
export interface LabExamLinkV14 {
  recordId: string;
  labCount: number;
  examCount: number;
}

/** 检验检查一致性检查入参 */
export interface LabExamConsistencyRecordV14 {
  hasLabReport: boolean;
  hasExamReport: boolean;
  hasDiagnosis: boolean;
}

/** 检验检查一致性检查结果 */
export interface LabExamConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 检验检查联动报告 */
export interface LabExamLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-检验检查联动数据。
 *
 * @param recordId 病历记录ID
 * @param labCount 检验数
 * @param examCount 检查数
 * @returns 联动数据
 */
export function buildLabExamLink(recordId: string, labCount: number, examCount: number): LabExamLinkV14 {
  return { recordId, labCount, examCount };
}

/**
 * 检查检验检查一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 检验检查一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkLabExamConsistency(record: LabExamConsistencyRecordV14): LabExamConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasLabReport) {
    defects.push("缺检验报告");
  }
  if (!record.hasExamReport) {
    defects.push("缺检查报告");
  }
  if (!record.hasDiagnosis) {
    defects.push("缺诊断");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建检验检查联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildLabExamLinkReport(result: LabExamConsistencyResultV14): LabExamLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
