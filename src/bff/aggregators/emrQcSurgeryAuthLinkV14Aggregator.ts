/**
 * 健澜科技 jlmedaios - 质控-手术分级授权联动 V14 聚合器（M515-D，M515 收官）
 *
 * 纯函数：构建质控-手术授权联动数据 + 检查手术授权一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-手术授权联动数据 */
export interface SurgeryAuthLinkV14 {
  recordId: string;
  surgeonLevel: string;
  surgeryLevel: string;
}

/** 手术授权一致性检查入参 */
export interface SurgeryAuthConsistencyRecordV14 {
  hasAuth: boolean;
  hasLevelMatch: boolean;
  hasRecord: boolean;
}

/** 手术授权一致性检查结果 */
export interface SurgeryAuthConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 手术授权联动报告 */
export interface SurgeryAuthLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-手术授权联动数据。
 *
 * @param recordId 病历记录ID
 * @param surgeonLevel 医师级别
 * @param surgeryLevel 手术级别
 * @returns 联动数据
 */
export function buildSurgeryAuthLink(recordId: string, surgeonLevel: string, surgeryLevel: string): SurgeryAuthLinkV14 {
  return { recordId, surgeonLevel, surgeryLevel };
}

/**
 * 检查手术授权一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 手术授权一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkSurgeryAuthConsistency(record: SurgeryAuthConsistencyRecordV14): SurgeryAuthConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasAuth) {
    defects.push("缺手术授权记录");
  }
  if (!record.hasLevelMatch) {
    defects.push("级别不匹配");
  }
  if (!record.hasRecord) {
    defects.push("缺手术记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建手术授权联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildSurgeryAuthLinkReport(result: SurgeryAuthConsistencyResultV14): SurgeryAuthLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
