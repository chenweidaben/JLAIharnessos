/**
 * 健澜科技 jlmedaios - 质控-手术麻醉联动 V14 聚合器（M513-D，M513 收官）
 *
 * 纯函数：构建质控-手术麻醉联动数据 + 检查手术麻醉一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-手术麻醉联动数据 */
export interface SurgeryLinkV14 {
  recordId: string;
  surgeon: string;
  anesthesiaType: string;
}

/** 手术麻醉一致性检查入参 */
export interface SurgeryConsistencyRecordV14 {
  hasOperativeNote: boolean;
  hasAnesthesiaRecord: boolean;
  hasPostOpNote: boolean;
}

/** 手术麻醉一致性检查结果 */
export interface SurgeryConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 手术麻醉联动报告 */
export interface SurgeryLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-手术麻醉联动数据。
 *
 * @param recordId 病历记录ID
 * @param surgeon 手术医生
 * @param anesthesiaType 麻醉方式
 * @returns 联动数据
 */
export function buildSurgeryLink(recordId: string, surgeon: string, anesthesiaType: string): SurgeryLinkV14 {
  return { recordId, surgeon, anesthesiaType };
}

/**
 * 检查手术麻醉一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 手术麻醉一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkSurgeryConsistency(record: SurgeryConsistencyRecordV14): SurgeryConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasOperativeNote) {
    defects.push("缺手术记录");
  }
  if (!record.hasAnesthesiaRecord) {
    defects.push("缺麻醉记录");
  }
  if (!record.hasPostOpNote) {
    defects.push("缺术后记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建手术麻醉联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildSurgeryLinkReport(result: SurgeryConsistencyResultV14): SurgeryLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
