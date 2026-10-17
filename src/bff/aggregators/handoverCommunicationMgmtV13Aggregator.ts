/**
 * 健澜科技 jlmedaios - 交接班沟通管理 V13 纯函数（M425-B，换名避让旧版 handoverDetailV13（M413））
 *
 * computeSbarHandoverComplianceRateV13 / computeHandoverOmissionRateV13 / computeHandoverRecordCompleteRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 交接班沟通管理记录 */
export interface HandoverCommunicationMgmtRecordV13 {
  sbarCompliant: number;
  omission: number;
  recordComplete: number;
  handoverTotal: number;
}

/**
 * SBAR 交接班规范率（纯函数）：规范交接班次数/交接班总次数×100，保留 2 位小数。
 *
 * @param records 交接班沟通管理记录列表
 * @returns SBAR 交接班规范率百分比
 */
export function computeSbarHandoverComplianceRateV13(records: HandoverCommunicationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.handoverTotal, 0);
  if (total === 0) return 0;
  const sbar = records.reduce((acc, r) => acc + r.sbarCompliant, 0);
  return Math.round((sbar / total) * 10000) / 100;
}

/**
 * 交接班遗漏率（纯函数，反向指标，值越低越好）：遗漏次数/交接班总次数×100，保留 2 位小数。
 *
 * @param records 交接班沟通管理记录列表
 * @returns 交接班遗漏率百分比
 */
export function computeHandoverOmissionRateV13(records: HandoverCommunicationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.handoverTotal, 0);
  if (total === 0) return 0;
  const omission = records.reduce((acc, r) => acc + r.omission, 0);
  return Math.round((omission / total) * 10000) / 100;
}

/**
 * 交接班记录完整率（纯函数）：完整记录数/交接班总次数×100，保留 2 位小数。
 *
 * @param records 交接班沟通管理记录列表
 * @returns 交接班记录完整率百分比
 */
export function computeHandoverRecordCompleteRateV13(records: HandoverCommunicationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.handoverTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.recordComplete, 0);
  return Math.round((complete / total) * 10000) / 100;
}
