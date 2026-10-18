/**
 * 健澜科技 jlmedaios - 票据管理 V13 纯函数（M448-D，M448 收官，财务与收费管理组）
 *
 * computeInvoiceRequisitionComplianceRateV13 / computeInvoiceWriteOffRateV13 / computeInvoiceElectronicIssuanceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 票据管理记录 */
export interface InvoiceMgmtRecordV13 {
  compliant: number;
  totalRequisition: number;
  writtenOff: number;
  totalInvoice: number;
  electronic: number;
  totalIssued: number;
}

/**
 * 票据领用合规率（纯函数）：合规领用次数/领用总次数×100，保留 2 位小数。
 *
 * @param records 票据管理记录列表
 * @returns 票据领用合规率百分比
 */
export function computeInvoiceRequisitionComplianceRateV13(records: InvoiceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRequisition, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 票据核销率（纯函数）：已核销票据数/票据总数×100，保留 2 位小数。
 *
 * @param records 票据管理记录列表
 * @returns 票据核销率百分比
 */
export function computeInvoiceWriteOffRateV13(records: InvoiceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalInvoice, 0);
  if (total === 0) return 0;
  const writtenOff = records.reduce((acc, r) => acc + r.writtenOff, 0);
  return Math.round((writtenOff / total) * 10000) / 100;
}

/**
 * 电子票据开具率（纯函数）：电子票据开具数/票据开具总数×100，保留 2 位小数。
 *
 * @param records 票据管理记录列表
 * @returns 电子票据开具率百分比
 */
export function computeInvoiceElectronicIssuanceRateV13(records: InvoiceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalIssued, 0);
  if (total === 0) return 0;
  const electronic = records.reduce((acc, r) => acc + r.electronic, 0);
  return Math.round((electronic / total) * 10000) / 100;
}
