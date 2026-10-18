/**
 * 健澜科技 jlmedaios - 运行病历质控 V14 聚合器（M481-A）
 *
 * 纯函数：运行病历质控记录构建 + 更新时限检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 运行病历质控记录 */
export interface RunningQcV14 {
  medicalRecordId: string;
  patientName: string;
  dept: string;
}

/** 运行病历时限检查结果 */
export interface RunningTimelinessV14 {
  overdue: boolean;
  overdueHours: number;
}

/**
 * 构建运行病历质控记录。
 *
 * @param medicalRecordId 病历号
 * @param patientName 患者姓名
 * @param dept 科室
 * @returns 运行病历质控记录
 */
export function buildRunningQc(medicalRecordId: string, patientName: string, dept: string): RunningQcV14 {
  return { medicalRecordId, patientName, dept };
}

/**
 * 检查运行病历更新时限：hoursSinceLastUpdate > maxHours 视为超时。
 *
 * @param hoursSinceLastUpdate 距最后更新小时数
 * @param maxHours 最大允许小时数
 * @returns 时限检查结果
 */
export function checkRunningTimeliness(
  hoursSinceLastUpdate: number,
  maxHours: number,
): RunningTimelinessV14 {
  const overdue = hoursSinceLastUpdate > maxHours;
  const overdueHours = overdue ? hoursSinceLastUpdate - maxHours : 0;
  return { overdue, overdueHours };
}
