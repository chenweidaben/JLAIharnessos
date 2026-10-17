/**
 * 健澜科技 jlmedaios - 护理管理明细 V13 纯函数（M405-C）
 *
 * computeHeadNurseWardRoundPassRateV13 / computeNursingAdverseEventReportRateV13 / computeNursingQCPassRateV13
 *
 * 避让旧版 nursingManagementV13（M376-D：护理单元数/床护比/培训完成率）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理管理明细记录 */
export interface NursingManagementDetailRecordV13 {
  headPass: number;
  headTotal: number;
  reported: number;
  totalAdverse: number;
  qcPass: number;
  qcTotal: number;
}

/**
 * 护士长查房合格率（纯函数）：合格次数/检查总次数×100，保留 2 位小数。
 *
 * @param records 护理管理明细记录列表
 * @returns 护士长查房合格率百分比
 */
export function computeHeadNurseWardRoundPassRateV13(records: NursingManagementDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.headTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.headPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 护理不良事件上报率（纯函数）：上报事件数/不良事件总数×100，保留 2 位小数。
 *
 * @param records 护理管理明细记录列表
 * @returns 护理不良事件上报率百分比
 */
export function computeNursingAdverseEventReportRateV13(records: NursingManagementDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAdverse, 0);
  if (total === 0) return 0;
  const reported = records.reduce((acc, r) => acc + r.reported, 0);
  return Math.round((reported / total) * 10000) / 100;
}

/**
 * 护理质控合格率（纯函数）：合格次数/质控总次数×100，保留 2 位小数。
 *
 * @param records 护理管理明细记录列表
 * @returns 护理质控合格率百分比
 */
export function computeNursingQCPassRateV13(records: NursingManagementDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.qcTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.qcPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}
