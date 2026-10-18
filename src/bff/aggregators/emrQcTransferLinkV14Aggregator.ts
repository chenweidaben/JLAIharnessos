/**
 * 健澜科技 jlmedaios - 质控-转科记录联动 V14 聚合器（M516-C）
 *
 * 纯函数：构建质控-转科联动数据 + 检查转科一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-转科联动数据 */
export interface TransferLinkV14 {
  recordId: string;
  fromDept: string;
  toDept: string;
}

/** 转科一致性检查入参 */
export interface TransferConsistencyRecordV14 {
  hasTransferRecord: boolean;
  hasHandover: boolean;
  hasReceiveNote: boolean;
}

/** 转科一致性检查结果 */
export interface TransferConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 转科联动报告 */
export interface TransferLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-转科联动数据。
 *
 * @param recordId 病历记录ID
 * @param fromDept 转出科室
 * @param toDept 转入科室
 * @returns 联动数据
 */
export function buildTransferLink(recordId: string, fromDept: string, toDept: string): TransferLinkV14 {
  return { recordId, fromDept, toDept };
}

/**
 * 检查转科一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 转科一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkTransferConsistency(record: TransferConsistencyRecordV14): TransferConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasTransferRecord) {
    defects.push("缺转科记录");
  }
  if (!record.hasHandover) {
    defects.push("缺交接记录");
  }
  if (!record.hasReceiveNote) {
    defects.push("缺接收记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建转科联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildTransferLinkReport(result: TransferConsistencyResultV14): TransferLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
