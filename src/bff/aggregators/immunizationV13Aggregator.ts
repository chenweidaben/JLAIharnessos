/**
 * 健澜科技 jlmedaios - 预防接种 V13 纯函数（M349-D，M349 收官）
 *
 * computeCardCreationRateV13 / computeSingleVaccineRateV13 / computeBoosterRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预防接种记录 */
export interface ImmunizationRecordV13 {
  cardCreatedCount: number;
  shouldCreateCardCount: number;
  singleVaccinatedCount: number;
  shouldVaccinateCount: number;
  boosterDoneCount: number;
  shouldBoosterCount: number;
}

/**
 * 建卡率（纯函数）：建卡数/应建卡数×100，保留 2 位小数。
 *
 * @param records 预防接种记录列表
 * @returns 建卡率百分比
 */
export function computeCardCreationRateV13(records: ImmunizationRecordV13[]): number {
  const created = records.reduce((acc, r) => acc + r.cardCreatedCount, 0);
  const should = records.reduce((acc, r) => acc + r.shouldCreateCardCount, 0);
  if (should === 0) return 0;
  return Math.round((created / should) * 10000) / 100;
}

/**
 * 单苗接种率（纯函数）：单苗接种数/应种数×100，保留 2 位小数。
 *
 * @param records 预防接种记录列表
 * @returns 单苗接种率百分比
 */
export function computeSingleVaccineRateV13(records: ImmunizationRecordV13[]): number {
  const vaccinated = records.reduce((acc, r) => acc + r.singleVaccinatedCount, 0);
  const should = records.reduce((acc, r) => acc + r.shouldVaccinateCount, 0);
  if (should === 0) return 0;
  return Math.round((vaccinated / should) * 10000) / 100;
}

/**
 * 加强免疫率（纯函数）：加强接种数/应加强数×100，保留 2 位小数。
 *
 * @param records 预防接种记录列表
 * @returns 加强免疫率百分比
 */
export function computeBoosterRateV13(records: ImmunizationRecordV13[]): number {
  const booster = records.reduce((acc, r) => acc + r.boosterDoneCount, 0);
  const should = records.reduce((acc, r) => acc + r.shouldBoosterCount, 0);
  if (should === 0) return 0;
  return Math.round((booster / should) * 10000) / 100;
}
