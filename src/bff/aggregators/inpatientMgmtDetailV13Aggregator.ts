/**
 * 健澜科技 jlmedaios - 住院管理（细节）V13 纯函数（M416-D，M416 收官，detail 避让旧版 inpatientBedMgmtV13）
 *
 * computeInpatientMedicalRecordPassRateV13 / computeInpatientStayOver30dRateV13 / computeInpatientPressureUlcerOccurrenceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 住院管理（细节）记录 */
export interface InpatientMgmtDetailRecordV13 {
  inpatientRecordQualified: number;
  inpatientRecordTotal: number;
  over30d: number;
  dischargeTotal: number;
  pressureUlcer: number;
  inpatientCaseTotal: number;
}

/**
 * 住院病历合格率（纯函数）：合格病历数/住院病历总数×100，保留 2 位小数。
 *
 * @param records 住院管理（细节）记录列表
 * @returns 住院病历合格率百分比
 */
export function computeInpatientMedicalRecordPassRateV13(records: InpatientMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientRecordTotal, 0);
  if (total === 0) return 0;
  const inpatientRecordQualified = records.reduce((acc, r) => acc + r.inpatientRecordQualified, 0);
  return Math.round((inpatientRecordQualified / total) * 10000) / 100;
}

/**
 * 住院超30天患者比例（纯函数，反向指标，值越低越好）：超30天患者数/出院总人数×100，保留 2 位小数。
 *
 * @param records 住院管理（细节）记录列表
 * @returns 住院超30天患者比例百分比
 */
export function computeInpatientStayOver30dRateV13(records: InpatientMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const over30d = records.reduce((acc, r) => acc + r.over30d, 0);
  return Math.round((over30d / total) * 10000) / 100;
}

/**
 * 住院患者压疮发生率（纯函数，反向指标，值越低越好）：发生压疮例数/住院总例数×100，保留 2 位小数。
 *
 * @param records 住院管理（细节）记录列表
 * @returns 住院患者压疮发生率百分比
 */
export function computeInpatientPressureUlcerOccurrenceRateV13(records: InpatientMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientCaseTotal, 0);
  if (total === 0) return 0;
  const pressureUlcer = records.reduce((acc, r) => acc + r.pressureUlcer, 0);
  return Math.round((pressureUlcer / total) * 10000) / 100;
}
