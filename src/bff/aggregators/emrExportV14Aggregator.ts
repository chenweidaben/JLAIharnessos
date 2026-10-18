/**
 * 健澜科技 jlmedaios - 病历数据导出与区域上报 V14 聚合器（M463-C）
 *
 * 纯函数：组装导出报文（patientName 脱敏）+ 校验必填字段。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 导出记录输入 */
export interface ExportRecordInputV14 {
  patientId: string;
  patientName: string;
  hospitalCode: string;
  recordType: string;
  diagnoses: string[];
}

/** 导出报文 */
export interface ExportPayloadV14 {
  patientId: string;
  patientName: string;
  hospitalCode: string;
  recordType: string;
  diagnoses: string[];
  exportedAt: string;
}

/** 校验结果 */
export interface ExportValidationResultV14 {
  valid: boolean;
  missing: string[];
}

/**
 * 脱敏患者姓名：保留姓 + "*"，如"张三"→"张*"。
 *
 * @param name 原始姓名
 * @returns 脱敏后姓名
 */
function maskName(name: string): string {
  if (!name) return "";
  const surname = name.charAt(0);
  return `${surname}*`;
}

/**
 * 组装导出报文。
 *
 * @param input 导出记录输入
 * @returns 导出报文（patientName 已脱敏）
 */
export function buildExportPayload(input: ExportRecordInputV14): ExportPayloadV14 {
  return {
    patientId: input.patientId,
    patientName: maskName(input.patientName),
    hospitalCode: input.hospitalCode,
    recordType: input.recordType,
    diagnoses: input.diagnoses,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * 校验导出报文必填字段。
 *
 * @param payload 导出报文
 * @returns valid + missing 列表
 */
export function validateExportSchema(payload: ExportPayloadV14): ExportValidationResultV14 {
  const missing: string[] = [];
  if (!payload.patientId) missing.push("patientId");
  if (!payload.hospitalCode) missing.push("hospitalCode");
  if (!payload.recordType) missing.push("recordType");
  return { valid: missing.length === 0, missing };
}
