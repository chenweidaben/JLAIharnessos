/**
 * 健澜科技 jlmedaios - 质控-医嘱联动 V14 聚合器（M513-B）
 *
 * 纯函数：构建质控-医嘱联动数据 + 检查医嘱一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-医嘱联动数据 */
export interface OrderLinkV14 {
  recordId: string;
  orderCount: number;
  status: string;
}

/** 医嘱一致性检查入参 */
export interface OrderConsistencyRecordV14 {
  hasDiagnosis: boolean;
  hasOrder: boolean;
  hasSignature: boolean;
}

/** 医嘱一致性检查结果 */
export interface OrderConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 医嘱联动报告 */
export interface OrderLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-医嘱联动数据。
 *
 * @param recordId 病历记录ID
 * @param orderCount 医嘱数量
 * @param status 医嘱状态
 * @returns 联动数据
 */
export function buildOrderLink(recordId: string, orderCount: number, status: string): OrderLinkV14 {
  return { recordId, orderCount, status };
}

/**
 * 检查医嘱一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 医嘱一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkOrderConsistency(record: OrderConsistencyRecordV14): OrderConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasDiagnosis) {
    defects.push("缺诊断");
  }
  if (!record.hasOrder) {
    defects.push("缺医嘱");
  }
  if (!record.hasSignature) {
    defects.push("缺签名");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建医嘱联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildOrderLinkReport(result: OrderConsistencyResultV14): OrderLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
