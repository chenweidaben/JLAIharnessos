/**
 * 健澜科技 jlmedaios - 检验质量 V13 纯函数（M360-A，新规格）
 *
 * computeInternalQcPassRateV13 / computeExternalQcPassRateV13 / computeLabReportTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检验质量记录 */
export interface LabQualityRecordV13 {
  internalQcPassed: number;
  internalQcCount: number;
  externalQcPassed: number;
  externalQcCount: number;
  reportTimely: number;
  reportCount: number;
}

/**
 * 室内质控合格率（纯函数）：合格次数/质控次数×100，保留 2 位小数。
 *
 * @param records 检验质量记录列表
 * @returns 室内质控合格率百分比
 */
export function computeInternalQcPassRateV13(records: LabQualityRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.internalQcPassed, 0);
  const total = records.reduce((acc, r) => acc + r.internalQcCount, 0);
  if (total === 0) return 0;
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 室间质评合格率（纯函数）：合格项数/参评项数×100，保留 2 位小数。
 *
 * @param records 检验质量记录列表
 * @returns 室间质评合格率百分比
 */
export function computeExternalQcPassRateV13(records: LabQualityRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.externalQcPassed, 0);
  const total = records.reduce((acc, r) => acc + r.externalQcCount, 0);
  if (total === 0) return 0;
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 检验报告及时率（纯函数）：及时数/报告数×100，保留 2 位小数。
 *
 * @param records 检验质量记录列表
 * @returns 检验报告及时率百分比
 */
export function computeLabReportTimelyRateV13(records: LabQualityRecordV13[]): number {
  const timely = records.reduce((acc, r) => acc + r.reportTimely, 0);
  const total = records.reduce((acc, r) => acc + r.reportCount, 0);
  if (total === 0) return 0;
  return Math.round((timely / total) * 10000) / 100;
}
