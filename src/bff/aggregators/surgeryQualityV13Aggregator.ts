/**
 * 健澜科技 jlmedaios - 手术质量 V13 纯函数（M371-C）
 *
 * computeSurgeryComplicationRateV13 / computeSurgeryMortalityRateV13 / computeType1IncisionHealingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术质量记录 */
export interface SurgeryQualityRecordV13 {
  surgeryCount: number;
  complicationCount: number;
  mortalityCount: number;
  type1IncisionCount: number;
  type1HealingGradeA: number;
}

/**
 * 手术并发症率（纯函数）：并发症数/手术数×100，保留 2 位小数。
 *
 * @param records 手术质量记录列表
 * @returns 手术并发症率百分比
 */
export function computeSurgeryComplicationRateV13(records: SurgeryQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surgeryCount, 0);
  if (total === 0) return 0;
  const complication = records.reduce((acc, r) => acc + r.complicationCount, 0);
  return Math.round((complication / total) * 10000) / 100;
}

/**
 * 手术死亡率（纯函数）：死亡数/手术数×100，保留 2 位小数。
 *
 * @param records 手术质量记录列表
 * @returns 手术死亡率百分比
 */
export function computeSurgeryMortalityRateV13(records: SurgeryQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surgeryCount, 0);
  if (total === 0) return 0;
  const mortality = records.reduce((acc, r) => acc + r.mortalityCount, 0);
  return Math.round((mortality / total) * 10000) / 100;
}

/**
 * Ⅰ类切口甲级愈合率（纯函数）：甲级愈合数/Ⅰ类切口数×100，保留 2 位小数。
 *
 * @param records 手术质量记录列表
 * @returns Ⅰ类切口甲级愈合率百分比
 */
export function computeType1IncisionHealingRateV13(records: SurgeryQualityRecordV13[]): number {
  const type1 = records.reduce((acc, r) => acc + r.type1IncisionCount, 0);
  if (type1 === 0) return 0;
  const gradeA = records.reduce((acc, r) => acc + r.type1HealingGradeA, 0);
  return Math.round((gradeA / type1) * 10000) / 100;
}
