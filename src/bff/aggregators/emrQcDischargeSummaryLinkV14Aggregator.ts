/**
 * 健澜科技 jlmedaios - 质控-出院小结联动 V14 聚合器（M516-B）
 *
 * 纯函数：构建质控-出院小结联动数据 + 检查出院小结一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-出院小结联动数据 */
export interface DischargeSummaryLinkV14 {
  recordId: string;
  dischargeDate: string;
  followUpDate: string;
}

/** 出院小结一致性检查入参 */
export interface DischargeSummaryConsistencyRecordV14 {
  hasDiagnosis: boolean;
  hasTreatment: boolean;
  hasFollowUp: boolean;
}

/** 出院小结一致性检查结果 */
export interface DischargeSummaryConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 出院小结联动报告 */
export interface DischargeSummaryLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-出院小结联动数据。
 *
 * @param recordId 病历记录ID
 * @param dischargeDate 出院日期
 * @param followUpDate 随访日期
 * @returns 联动数据
 */
export function buildDischargeSummaryLink(recordId: string, dischargeDate: string, followUpDate: string): DischargeSummaryLinkV14 {
  return { recordId, dischargeDate, followUpDate };
}

/**
 * 检查出院小结一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 出院小结一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkDischargeSummaryConsistency(record: DischargeSummaryConsistencyRecordV14): DischargeSummaryConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasDiagnosis) {
    defects.push("缺诊断记录");
  }
  if (!record.hasTreatment) {
    defects.push("缺治疗方案记录");
  }
  if (!record.hasFollowUp) {
    defects.push("缺随访计划");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建出院小结联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildDischargeSummaryLinkReport(result: DischargeSummaryConsistencyResultV14): DischargeSummaryLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
