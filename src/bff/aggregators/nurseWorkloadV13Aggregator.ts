/**
 * 健澜科技 jlmedaios - 护士工作量 V13 纯函数（M330-B）
 *
 * computeAvgNursingDaysV13 / countNursingOperationsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护士工作量 */
export interface NurseWorkloadV13 {
  nurseName: string;
  nursingDays: number;
  nursingOperations: number;
}

/**
 * 人均分管床日（纯函数）：均值。
 *
 * @param nurses 护士列表
 * @returns 人均床日
 */
export function computeAvgNursingDaysV13(nurses: NurseWorkloadV13[]): number {
  if (nurses.length === 0) return 0;
  const total = nurses.reduce((acc, n) => acc + n.nursingDays, 0);
  return Math.round(total / nurses.length);
}

/**
 * 护理操作次数汇总（纯函数）：求和。
 *
 * @param nurses 护士列表
 * @returns 护理操作总次数
 */
export function countNursingOperationsV13(nurses: NurseWorkloadV13[]): number {
  return nurses.reduce((acc, n) => acc + n.nursingOperations, 0);
}
