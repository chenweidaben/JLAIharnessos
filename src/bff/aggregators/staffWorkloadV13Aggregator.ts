/**
 * 健澜科技 jlmedaios - 医护工作量与疲劳度监测 V13 纯函数（M311-B）
 *
 * computeAvgTasksPerDayV13 / assessFatigueLevelV13 / identifyOverloadedStaffV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医护工作量 */
export interface StaffWorkloadV13 {
  staffId: string;
  name: string;
  totalTasks: number;
  workingDays: number;
  overtimeHours: number;
}

/**
 * 人均日任务数（纯函数）：totalTasks / workingDays，保留1位。
 *
 * @param staff 医护
 * @returns 日任务数
 */
export function computeAvgTasksPerDayV13(staff: StaffWorkloadV13): number {
  if (staff.workingDays === 0) return 0;
  return Math.round((staff.totalTasks / staff.workingDays) * 10) / 10;
}

/**
 * 疲劳灯色（纯函数）：任务>12 或 加班>3h → 红灯；任务 8-12 或加班 1-3h → 黄灯；否则绿灯。
 *
 * @param staff 医护
 * @returns 灯色
 */
export function assessFatigueLevelV13(staff: StaffWorkloadV13): string {
  if (staff.totalTasks > 12 || staff.overtimeHours > 3) return "红灯";
  if ((staff.totalTasks >= 8 && staff.totalTasks <= 12) || (staff.overtimeHours >= 1 && staff.overtimeHours <= 3)) {
    return "黄灯";
  }
  return "绿灯";
}

/**
 * 过载人员列表（纯函数）：红灯 staff。
 *
 * @param staffList 医护列表
 * @returns 红灯列表
 */
export function identifyOverloadedStaffV13(staffList: StaffWorkloadV13[]): StaffWorkloadV13[] {
  return staffList.filter((s) => assessFatigueLevelV13(s) === "红灯");
}
