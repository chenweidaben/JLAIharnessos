/**
 * 健澜科技 jlmedaios - 急诊分诊 V13 纯函数（M335-A）
 *
 * computeTriageDistributionV13 / computeIIPlusWaitTimeV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急诊分诊记录 */
export interface TriageRecordV13 {
  triageLevel: string;
  waitMinutes: number;
}

/** 分诊量分布项 */
export interface TriageDistributionItemV13 {
  level: string;
  count: number;
}

/**
 * I/II/III/IV 级分诊量分布（纯函数）：分组计数。
 *
 * @param records 分诊记录列表
 * @returns 各级分诊量
 */
export function computeTriageDistributionV13(records: TriageRecordV13[]): TriageDistributionItemV13[] {
  const levels = ["I", "II", "III", "IV"];
  return levels.map((level) => ({
    level,
    count: records.filter((r) => r.triageLevel === level).length,
  }));
}

/**
 * II 级以上平均等候时长（纯函数）：I 级 + II 级的等候时长均值，保留 1 位小数。
 *
 * @param records 分诊记录列表
 * @returns 平均等候时长（分钟）
 */
export function computeIIPlusWaitTimeV13(records: TriageRecordV13[]): number {
  const iiPlus = records.filter((r) => r.triageLevel === "I" || r.triageLevel === "II");
  if (iiPlus.length === 0) return 0;
  const total = iiPlus.reduce((acc, r) => acc + r.waitMinutes, 0);
  return Math.round((total / iiPlus.length) * 10) / 10;
}
