/**
 * 健澜科技 jlmedaios - 手术量分级 V13 纯函数（M339-A）
 *
 * computeGradeDistributionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术量分级记录 */
export interface SurgeryVolumeRecordV13 {
  grade: string;
  count: number;
}

/** 手术分级占比项 */
export interface GradeDistributionItemV13 {
  grade: string;
  count: number;
  percent: number;
}

/**
 * 一/二/三/四级手术占比（纯函数）：分组计数后求占比，保留 1 位小数。
 *
 * @param records 手术量分级记录列表
 * @returns 各级手术占比
 */
export function computeGradeDistributionV13(records: SurgeryVolumeRecordV13[]): GradeDistributionItemV13[] {
  const total = records.reduce((acc, r) => acc + r.count, 0);
  return records.map((r) => ({
    grade: r.grade,
    count: r.count,
    percent: total === 0 ? 0 : Math.round((r.count / total) * 1000) / 10,
  }));
}
