/**
 * 健澜科技 jlmedaios - 质控-电子签名联动 V14 聚合器（M513-A）
 *
 * 纯函数：构建质控-签名联动数据 + 检查签名合规性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-签名联动数据 */
export interface SignatureLinkV14 {
  recordId: string;
  doctor: string;
  signed: boolean;
}

/** 签名合规检查入参 */
export interface SignatureComplianceRecordV14 {
  hasContent: boolean;
  hasSignature: boolean;
  hasTimestamp: boolean;
}

/** 签名合规检查结果 */
export interface SignatureComplianceResultV14 {
  pass: boolean;
  defects: string[];
}

/** 签名联动报告 */
export interface SignatureLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-签名联动数据。
 *
 * @param recordId 病历记录ID
 * @param doctor 医生姓名
 * @param signed 是否已签名
 * @returns 联动数据
 */
export function buildSignatureLink(recordId: string, doctor: string, signed: boolean): SignatureLinkV14 {
  return { recordId, doctor, signed };
}

/**
 * 检查签名合规性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 签名合规检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkSignatureCompliance(record: SignatureComplianceRecordV14): SignatureComplianceResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasContent) {
    defects.push("缺病历内容");
  }
  if (!record.hasSignature) {
    defects.push("缺电子签名");
  }
  if (!record.hasTimestamp) {
    defects.push("缺时间戳");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建签名联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildSignatureLinkReport(result: SignatureComplianceResultV14): SignatureLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
