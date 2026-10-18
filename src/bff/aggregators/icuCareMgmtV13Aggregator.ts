/**
 * 健澜科技 jlmedaios - ICU 护理管理 V13 纯函数（M428-D，M428 收官，换名避让旧版 icuMgmtV13（M416，-care 后缀））
 *
 * computeIcuMortalityRateV13 / computeIcuPressureUlcerOccurrenceRateV13 / computeIcuCatheterRelatedInfectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ICU 护理管理记录 */
export interface IcuCareMgmtRecordV13 {
  icuDeath: number;
  icuDischargeTotal: number;
  icuPressureUlcer: number;
  icuTotal: number;
  catheterInfection: number;
  catheterTotal: number;
}

/**
 * ICU 死亡率（纯函数，百分率%，反向指标，值越低越好）：ICU 死亡患者数/ICU 出院患者总数×100，保留 2 位小数。
 *
 * @param records ICU 护理管理记录列表
 * @returns ICU 死亡率百分比
 */
export function computeIcuMortalityRateV13(records: IcuCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.icuDischargeTotal, 0);
  if (total === 0) return 0;
  const death = records.reduce((acc, r) => acc + r.icuDeath, 0);
  return Math.round((death / total) * 10000) / 100;
}

/**
 * ICU 压疮发生率（纯函数，百分率%，反向指标，值越低越好）：发生压疮患者数/ICU 患者总数×100，保留 2 位小数。
 *
 * @param records ICU 护理管理记录列表
 * @returns ICU 压疮发生率百分比
 */
export function computeIcuPressureUlcerOccurrenceRateV13(records: IcuCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.icuTotal, 0);
  if (total === 0) return 0;
  const ulcer = records.reduce((acc, r) => acc + r.icuPressureUlcer, 0);
  return Math.round((ulcer / total) * 10000) / 100;
}

/**
 * ICU 导管相关感染率（纯函数，百分率%，反向指标，值越低越好）：发生感染患者数/ICU 导管使用患者总数×100，保留 2 位小数。
 *
 * @param records ICU 护理管理记录列表
 * @returns ICU 导管相关感染率百分比
 */
export function computeIcuCatheterRelatedInfectionRateV13(records: IcuCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.catheterTotal, 0);
  if (total === 0) return 0;
  const infection = records.reduce((acc, r) => acc + r.catheterInfection, 0);
  return Math.round((infection / total) * 10000) / 100;
}
