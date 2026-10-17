/**
 * 健澜科技 jlmedaios - ICU 管理 V13 纯函数（M416-A）
 *
 * computeIcuApacheIIPassRateV13 / computeIcuUnplannedExtubationRateV13 / computeIcuAverageLosDaysV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ICU 管理记录 */
export interface IcuMgmtRecordV13 {
  apacheQualified: number;
  icuPatientTotal: number;
  unplannedExtubation: number;
  intubationTotal: number;
  losDays: number;
}

/**
 * ICU 患者 APACHE II 评分合格率（纯函数）：合格例数/ICU 患者总数×100，保留 2 位小数。
 *
 * @param records ICU 管理记录列表
 * @returns ICU 患者 APACHE II 评分合格率百分比
 */
export function computeIcuApacheIIPassRateV13(records: IcuMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.icuPatientTotal, 0);
  if (total === 0) return 0;
  const apacheQualified = records.reduce((acc, r) => acc + r.apacheQualified, 0);
  return Math.round((apacheQualified / total) * 10000) / 100;
}

/**
 * ICU 非计划拔管率（纯函数，反向指标，值越低越好）：非计划拔管例数/ICU 气管插管总数×100，保留 2 位小数。
 *
 * @param records ICU 管理记录列表
 * @returns ICU 非计划拔管率百分比
 */
export function computeIcuUnplannedExtubationRateV13(records: IcuMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.intubationTotal, 0);
  if (total === 0) return 0;
  const unplannedExtubation = records.reduce((acc, r) => acc + r.unplannedExtubation, 0);
  return Math.round((unplannedExtubation / total) * 10000) / 100;
}

/**
 * ICU 平均住院日（纯函数）：平均值，单位天，保留 1 位小数。
 *
 * @param records ICU 管理记录列表
 * @returns ICU 平均住院日（天）
 */
export function computeIcuAverageLosDaysV13(records: IcuMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.losDays, 0);
  return Math.round((total / records.length) * 10) / 10;
}
