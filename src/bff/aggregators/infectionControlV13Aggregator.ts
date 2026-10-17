/**
 * 健澜科技 jlmedaios - 院感控制 V13 纯函数（M370-A）
 *
 * computeInfectionRateV13 / computeHandHygieneComplianceRateV13 / computeDisinfectionSterilizationPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院感控制记录 */
export interface InfectionControlRecordV13 {
  inpatientCount: number;
  infectionCount: number;
  handHygieneShould: number;
  handHygieneDone: number;
  disinfectionSample: number;
  disinfectionPass: number;
}

/**
 * 院感发病率（纯函数）：感染人数/住院人数×100，保留 2 位小数。
 *
 * @param records 院感控制记录列表
 * @returns 院感发病率百分比
 */
export function computeInfectionRateV13(records: InfectionControlRecordV13[]): number {
  const inpatient = records.reduce((acc, r) => acc + r.inpatientCount, 0);
  if (inpatient === 0) return 0;
  const infection = records.reduce((acc, r) => acc + r.infectionCount, 0);
  return Math.round((infection / inpatient) * 10000) / 100;
}

/**
 * 手卫生依从率（纯函数）：依从次数/应做次数×100，保留 2 位小数。
 *
 * @param records 院感控制记录列表
 * @returns 手卫生依从率百分比
 */
export function computeHandHygieneComplianceRateV13(records: InfectionControlRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.handHygieneShould, 0);
  if (should === 0) return 0;
  const done = records.reduce((acc, r) => acc + r.handHygieneDone, 0);
  return Math.round((done / should) * 10000) / 100;
}

/**
 * 消毒灭菌合格率（纯函数）：合格数/采样数×100，保留 2 位小数。
 *
 * @param records 院感控制记录列表
 * @returns 消毒灭菌合格率百分比
 */
export function computeDisinfectionSterilizationPassRateV13(records: InfectionControlRecordV13[]): number {
  const sample = records.reduce((acc, r) => acc + r.disinfectionSample, 0);
  if (sample === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.disinfectionPass, 0);
  return Math.round((pass / sample) * 10000) / 100;
}
