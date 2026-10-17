/**
 * 健澜科技 jlmedaios - 院感发生率 V13 纯函数（M341-B）
 *
 * computeInfectionRatePer1000BedDaysV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院感发生率记录 */
export interface NosocomialInfectionRecordV13 {
  bedDays: number;
  infectionCount: number;
}

/**
 * 千住院日院感次数（纯函数）：院感次数×1000/总住院天数，保留 1 位小数。
 *
 * @param records 院感发生率记录列表
 * @returns 千住院日院感次数（‰）
 */
export function computeInfectionRatePer1000BedDaysV13(records: NosocomialInfectionRecordV13[]): number {
  const bedDays = records.reduce((acc, r) => acc + r.bedDays, 0);
  const infections = records.reduce((acc, r) => acc + r.infectionCount, 0);
  if (bedDays === 0) return 0;
  return Math.round((infections * 1000 / bedDays) * 10) / 10;
}
