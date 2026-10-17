/**
 * 健澜科技 jlmedaios - 压疮管理（细节）V13 纯函数（M422-B，detail 避让旧版 pressureUlcerMgmtV13（M394-B））
 *
 * computeHospitalPressureUlcerOccurrenceRateV13 / computePressureUlcerReportTimelyRateV13 / computePressureUlcerHealingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 压疮管理（细节）记录 */
export interface PressureUlcerDetailRecordV13 {
  occurredPatients: number;
  inpatientTotal: number;
  reportedTimely: number;
  pressureUlcerTotal: number;
  healedCount: number;
}

/**
 * 院内压疮发生率（纯函数，反向指标，值越低越好）：发生压疮患者数/住院患者总数×100，保留 2 位小数。
 *
 * @param records 压疮管理（细节）记录列表
 * @returns 院内压疮发生率百分比
 */
export function computeHospitalPressureUlcerOccurrenceRateV13(records: PressureUlcerDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotal, 0);
  if (total === 0) return 0;
  const occurred = records.reduce((acc, r) => acc + r.occurredPatients, 0);
  return Math.round((occurred / total) * 10000) / 100;
}

/**
 * 压疮上报及时率（纯函数）：及时上报数/压疮总数×100，保留 2 位小数。
 *
 * @param records 压疮管理（细节）记录列表
 * @returns 压疮上报及时率百分比
 */
export function computePressureUlcerReportTimelyRateV13(records: PressureUlcerDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.pressureUlcerTotal, 0);
  if (total === 0) return 0;
  const reportedTimely = records.reduce((acc, r) => acc + r.reportedTimely, 0);
  return Math.round((reportedTimely / total) * 10000) / 100;
}

/**
 * 压疮愈合率（纯函数）：愈合压疮数/压疮患者总数×100，保留 2 位小数。
 *
 * @param records 压疮管理（细节）记录列表
 * @returns 压疮愈合率百分比
 */
export function computePressureUlcerHealingRateV13(records: PressureUlcerDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.pressureUlcerTotal, 0);
  if (total === 0) return 0;
  const healed = records.reduce((acc, r) => acc + r.healedCount, 0);
  return Math.round((healed / total) * 10000) / 100;
}
