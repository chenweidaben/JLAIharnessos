/**
 * 健澜科技 jlmedaios - 手术部位感染 V13 纯函数（M357-C）
 *
 * computeSsiRateV13 / computeClass1IncisionInfectionRateV13 / computePerioperativeProphylaxisRationalRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术部位感染记录 */
export interface SurgicalInfectionRecordV13 {
  ssiInfected: number;
  surgeryCount: number;
  class1Infected: number;
  class1IncisionCount: number;
  prophylaxisRational: number;
  prophylaxisCount: number;
}

/**
 * SSI 发生率（纯函数）：感染数/手术数×100，保留 2 位小数。
 *
 * @param records 手术部位感染记录列表
 * @returns SSI 发生率百分比
 */
export function computeSsiRateV13(records: SurgicalInfectionRecordV13[]): number {
  const infected = records.reduce((acc, r) => acc + r.ssiInfected, 0);
  const total = records.reduce((acc, r) => acc + r.surgeryCount, 0);
  if (total === 0) return 0;
  return Math.round((infected / total) * 10000) / 100;
}

/**
 * Ⅰ类切口感染率（纯函数）：感染数/Ⅰ类切口数×100，保留 2 位小数。
 *
 * @param records 手术部位感染记录列表
 * @returns Ⅰ类切口感染率百分比
 */
export function computeClass1IncisionInfectionRateV13(records: SurgicalInfectionRecordV13[]): number {
  const infected = records.reduce((acc, r) => acc + r.class1Infected, 0);
  const total = records.reduce((acc, r) => acc + r.class1IncisionCount, 0);
  if (total === 0) return 0;
  return Math.round((infected / total) * 10000) / 100;
}

/**
 * 围术期预防用药合理率（纯函数）：合理数/预防用药数×100，保留 2 位小数。
 *
 * @param records 手术部位感染记录列表
 * @returns 围术期预防用药合理率百分比
 */
export function computePerioperativeProphylaxisRationalRateV13(records: SurgicalInfectionRecordV13[]): number {
  const rational = records.reduce((acc, r) => acc + r.prophylaxisRational, 0);
  const total = records.reduce((acc, r) => acc + r.prophylaxisCount, 0);
  if (total === 0) return 0;
  return Math.round((rational / total) * 10000) / 100;
}
