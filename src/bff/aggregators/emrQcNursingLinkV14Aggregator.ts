/**
 * 健澜科技 jlmedaios - 质控-护理记录联动 V14 聚合器（M513-C）
 *
 * 纯函数：构建质控-护理联动数据 + 检查护理一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-护理联动数据 */
export interface NursingLinkV14 {
  recordId: string;
  nurse: string;
  noteCount: number;
}

/** 护理一致性检查入参 */
export interface NursingConsistencyRecordV14 {
  hasCareRecord: boolean;
  hasVitalSigns: boolean;
  hasSignature: boolean;
}

/** 护理一致性检查结果 */
export interface NursingConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 护理联动报告 */
export interface NursingLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-护理联动数据。
 *
 * @param recordId 病历记录ID
 * @param nurse 护士姓名
 * @param noteCount 护理记录数
 * @returns 联动数据
 */
export function buildNursingLink(recordId: string, nurse: string, noteCount: number): NursingLinkV14 {
  return { recordId, nurse, noteCount };
}

/**
 * 检查护理一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 护理一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkNursingConsistency(record: NursingConsistencyRecordV14): NursingConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasCareRecord) {
    defects.push("缺护理记录");
  }
  if (!record.hasVitalSigns) {
    defects.push("缺生命体征记录");
  }
  if (!record.hasSignature) {
    defects.push("缺签名");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建护理联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildNursingLinkReport(result: NursingConsistencyResultV14): NursingLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
