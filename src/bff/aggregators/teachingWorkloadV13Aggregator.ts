/**
 * 健澜科技 jlmedaios - 教学工作 V13 纯函数（M355-C）
 *
 * computeAnnualTeachingVisitsV13 / computeInternCountV13 / computeAnnualTeachingHoursV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 教学工作记录 */
export interface TeachingWorkloadRecordV13 {
  annualTeachingVisits: number;
  internCount: number;
  annualTeachingHours: number;
}

/**
 * 年度带教人次（纯函数）：求和。
 *
 * @param records 教学工作记录列表
 * @returns 年度带教人次
 */
export function computeAnnualTeachingVisitsV13(records: TeachingWorkloadRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.annualTeachingVisits, 0);
}

/**
 * 在院实习进修生数（纯函数）：求和。
 *
 * @param records 教学工作记录列表
 * @returns 在院实习进修生数
 */
export function computeInternCountV13(records: TeachingWorkloadRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.internCount, 0);
}

/**
 * 年度教学课时（纯函数）：求和。
 *
 * @param records 教学工作记录列表
 * @returns 年度教学课时
 */
export function computeAnnualTeachingHoursV13(records: TeachingWorkloadRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.annualTeachingHours, 0);
}
