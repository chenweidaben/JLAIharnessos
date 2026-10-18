/**
 * 健澜科技 jlmedaios - 质控-病案首页联动 V14 聚合器（M516-A）
 *
 * 纯函数：构建质控-病案首页联动数据 + 检查病案首页一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-病案首页联动数据 */
export interface HomepageLinkV14 {
  recordId: string;
  diagnosisCount: number;
  surgeryCount: number;
}

/** 病案首页一致性检查入参 */
export interface HomepageConsistencyRecordV14 {
  hasDiagnosis: boolean;
  hasSurgery: boolean;
  hasDischargeInfo: boolean;
}

/** 病案首页一致性检查结果 */
export interface HomepageConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 病案首页联动报告 */
export interface HomepageLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-病案首页联动数据。
 *
 * @param recordId 病历记录ID
 * @param diagnosisCount 诊断数
 * @param surgeryCount 手术数
 * @returns 联动数据
 */
export function buildHomepageLink(recordId: string, diagnosisCount: number, surgeryCount: number): HomepageLinkV14 {
  return { recordId, diagnosisCount, surgeryCount };
}

/**
 * 检查病案首页一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 病案首页一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkHomepageConsistency(record: HomepageConsistencyRecordV14): HomepageConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasDiagnosis) {
    defects.push("缺首页诊断信息");
  }
  if (!record.hasSurgery) {
    defects.push("缺首页手术信息");
  }
  if (!record.hasDischargeInfo) {
    defects.push("缺出院信息");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建病案首页联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildHomepageLinkReport(result: HomepageConsistencyResultV14): HomepageLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
