/**
 * 健澜科技 jlmedaios - 疫苗接种 V13 纯函数（M393-D，M393 收官）
 *
 * computeHealthcareWorkerVaccinationRateV13 / computeFluVaccinationRateV13 / computeHBsAbPositiveRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 疫苗接种记录 */
export interface VaccinationMgmtRecordV13 {
  vaccinatedCount: number;
  shouldCount: number;
  fluVaccinatedCount: number;
  fluShouldCount: number;
  positiveCount: number;
  testedCount: number;
}

/**
 * 医护人员疫苗接种率（纯函数）：已接种人数/应接种人数×100，保留 2 位小数。
 *
 * @param records 疫苗接种记录列表
 * @returns 医护人员疫苗接种率百分比
 */
export function computeHealthcareWorkerVaccinationRateV13(records: VaccinationMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const vaccinated = records.reduce((acc, r) => acc + r.vaccinatedCount, 0);
  return Math.round((vaccinated / should) * 10000) / 100;
}

/**
 * 流感疫苗接种率（纯函数）：已接种人数/应接种人数×100，保留 2 位小数。
 *
 * @param records 疫苗接种记录列表
 * @returns 流感疫苗接种率百分比
 */
export function computeFluVaccinationRateV13(records: VaccinationMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.fluShouldCount, 0);
  if (should === 0) return 0;
  const fluVaccinated = records.reduce((acc, r) => acc + r.fluVaccinatedCount, 0);
  return Math.round((fluVaccinated / should) * 10000) / 100;
}

/**
 * 乙肝表面抗体阳性率（纯函数）：阳性人数/检测人数×100，保留 2 位小数。
 *
 * @param records 疫苗接种记录列表
 * @returns 乙肝表面抗体阳性率百分比
 */
export function computeHBsAbPositiveRateV13(records: VaccinationMgmtRecordV13[]): number {
  const tested = records.reduce((acc, r) => acc + r.testedCount, 0);
  if (tested === 0) return 0;
  const positive = records.reduce((acc, r) => acc + r.positiveCount, 0);
  return Math.round((positive / tested) * 10000) / 100;
}
