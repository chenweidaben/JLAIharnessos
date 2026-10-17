/**
 * 健澜科技 jlmedaios - 转科管理（细节）V13 纯函数（M427-B，detail 避让旧版 transferMgmtV13（M411））
 *
 * computeTransferHandoverCompleteRateV13 / computeTransferRecordTimelyRateV13 / computeTransferPatientSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 转科管理（细节）记录 */
export interface TransferDetailRecordV13 {
  handoverComplete: number;
  transferTimely: number;
  transferTotal: number;
  satisfiedPatients: number;
  surveyedPatients: number;
}

/**
 * 转科交接完整率（纯函数）：完整交接记录数/转科总次数×100，保留 2 位小数。
 *
 * @param records 转科管理（细节）记录列表
 * @returns 转科交接完整率百分比
 */
export function computeTransferHandoverCompleteRateV13(records: TransferDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transferTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.handoverComplete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 转科记录及时率（纯函数）：及时完成转科记录数/转科总次数×100，保留 2 位小数。
 *
 * @param records 转科管理（细节）记录列表
 * @returns 转科记录及时率百分比
 */
export function computeTransferRecordTimelyRateV13(records: TransferDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transferTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.transferTimely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 转科患者满意度（纯函数）：满意患者数/调查转科患者总数×100，保留 2 位小数。
 *
 * @param records 转科管理（细节）记录列表
 * @returns 转科患者满意度百分比
 */
export function computeTransferPatientSatisfactionRateV13(records: TransferDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedPatients, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedPatients, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}
