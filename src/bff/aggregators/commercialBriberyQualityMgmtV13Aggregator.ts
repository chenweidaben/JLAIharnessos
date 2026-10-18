/**
 * 健澜科技 jlmedaios - 商业贿赂治理质量管理 V13 纯函数（M438-C，行风廉洁与职业道德建设组）
 *
 * computeCommercialBriberyContractSignRateV13 / computeCommercialBriberyViolationInvestigationRateV13 / computeCommercialBriberySupplierCommitmentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 商业贿赂治理质量管理记录 */
export interface CommercialBriberyQualityMgmtRecordV13 {
  signedContracts: number;
  totalContracts: number;
  investigatedCases: number;
  totalViolationCases: number;
  committedSuppliers: number;
  totalSuppliers: number;
}

/**
 * 购销领域廉洁合同签署率（纯函数）：已签署合同数/应签署合同总数×100，保留 2 位小数。
 *
 * @param records 商业贿赂治理质量管理记录列表
 * @returns 购销领域廉洁合同签署率百分比
 */
export function computeCommercialBriberyContractSignRateV13(records: CommercialBriberyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalContracts, 0);
  if (total === 0) return 0;
  const signed = records.reduce((acc, r) => acc + r.signedContracts, 0);
  return Math.round((signed / total) * 10000) / 100;
}

/**
 * 违规案件查处率（纯函数）：已查处案件数/发现违规案件总数×100，保留 2 位小数。
 *
 * @param records 商业贿赂治理质量管理记录列表
 * @returns 违规案件查处率百分比
 */
export function computeCommercialBriberyViolationInvestigationRateV13(records: CommercialBriberyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalViolationCases, 0);
  if (total === 0) return 0;
  const investigated = records.reduce((acc, r) => acc + r.investigatedCases, 0);
  return Math.round((investigated / total) * 10000) / 100;
}

/**
 * 供应商廉洁承诺率（纯函数）：已承诺供应商数/供应商总数×100，保留 2 位小数。
 *
 * @param records 商业贿赂治理质量管理记录列表
 * @returns 供应商廉洁承诺率百分比
 */
export function computeCommercialBriberySupplierCommitmentRateV13(records: CommercialBriberyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSuppliers, 0);
  if (total === 0) return 0;
  const committed = records.reduce((acc, r) => acc + r.committedSuppliers, 0);
  return Math.round((committed / total) * 10000) / 100;
}
