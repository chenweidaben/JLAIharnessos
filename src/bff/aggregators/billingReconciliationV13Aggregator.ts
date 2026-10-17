/**
 * 健澜科技 jlmedaios - 医保对账 V13 纯函数（M329-A）
 *
 * countReconciliationRecordsV13 / countDiscrepancyRecordsV13 / computeDiscrepancyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 对账记录 */
export interface ReconciliationRecordV13 {
  recordId: string;
  hasDiscrepancy: boolean;
}

/**
 * 本月对账笔数（纯函数）：总数。
 *
 * @param records 对账记录列表
 * @returns 对账笔数
 */
export function countReconciliationRecordsV13(records: ReconciliationRecordV13[]): number {
  return records.length;
}

/**
 * 差异笔数（纯函数）：对账不一致。
 *
 * @param records 对账记录列表
 * @returns 差异笔数
 */
export function countDiscrepancyRecordsV13(records: ReconciliationRecordV13[]): number {
  return records.filter((r) => r.hasDiscrepancy).length;
}

/**
 * 差异率（纯函数）：差异/总对账×100。
 *
 * @param total 总对账笔数
 * @param discrepancy 差异笔数
 * @returns 差异率百分比
 */
export function computeDiscrepancyRateV13(total: number, discrepancy: number): number {
  if (total === 0) return 0;
  return Math.round((discrepancy / total) * 100);
}
