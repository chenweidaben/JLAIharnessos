/**
 * 健澜科技 jlmedaios - 质控-输血记录联动 V14 聚合器（M514-B）
 *
 * 纯函数：构建质控-输血联动数据 + 检查输血一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-输血联动数据 */
export interface TransfusionLinkV14 {
  recordId: string;
  bloodType: string;
  units: number;
}

/** 输血一致性检查入参 */
export interface TransfusionConsistencyRecordV14 {
  hasConsent: boolean;
  hasCrossmatch: boolean;
  hasTransfusionRecord: boolean;
}

/** 输血一致性检查结果 */
export interface TransfusionConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 输血联动报告 */
export interface TransfusionLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-输血联动数据。
 *
 * @param recordId 病历记录ID
 * @param bloodType 血型
 * @param units 单位数
 * @returns 联动数据
 */
export function buildTransfusionLink(recordId: string, bloodType: string, units: number): TransfusionLinkV14 {
  return { recordId, bloodType, units };
}

/**
 * 检查输血一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 输血一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkTransfusionConsistency(record: TransfusionConsistencyRecordV14): TransfusionConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasConsent) {
    defects.push("缺输血同意书");
  }
  if (!record.hasCrossmatch) {
    defects.push("缺交叉配血记录");
  }
  if (!record.hasTransfusionRecord) {
    defects.push("缺输血记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建输血联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildTransfusionLinkReport(result: TransfusionConsistencyResultV14): TransfusionLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
