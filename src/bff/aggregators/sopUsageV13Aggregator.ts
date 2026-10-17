/**
 * 健澜科技 jlmedaios - SOP 引用次数回灌飞轮分 V13 纯函数（M309-B）
 *
 * trackSopUsageV13 / creditDoctorBySopUsageV13 / rollbackSopUsageToFlywheelV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** SOP 引用记录 */
export interface SopUsageV13 {
  sopId: string;
  doctorId: string;
}

/** 医生加分 */
export interface DoctorCreditV13 {
  doctorId: string;
  baseScore: number;
  usageCount: number;
}

/**
 * 记录 SOP 被调用（纯函数）：返回新引用记录。
 *
 * @param sopId SOP ID
 * @param doctorId 医生 ID
 * @returns 引用记录
 */
export function trackSopUsageV13(sopId: string, doctorId: string): SopUsageV13 {
  return { sopId, doctorId };
}

/**
 * 给 Doctor MUSE 加经验分（纯函数）：每次引用 +2，上限 100。
 *
 * @param doctor 医生
 * @param usageCount 引用次数
 * @returns 新分数
 */
export function creditDoctorBySopUsageV13(doctor: DoctorCreditV13, usageCount: number): number {
  const next = doctor.baseScore + usageCount * 2;
  return Math.min(100, Math.round(next));
}

/**
 * 汇总回灌飞轮（纯函数）：总引用数×0.1 加到飞轮分，clamp 100。
 *
 * @param doctors 医生列表
 * @param prevFlywheelScore 原飞轮分
 * @returns 回灌后飞轮分
 */
export function rollbackSopUsageToFlywheelV13(
  doctors: DoctorCreditV13[],
  prevFlywheelScore: number,
): number {
  const totalUsage = doctors.reduce((s, d) => s + d.usageCount, 0);
  const next = prevFlywheelScore + totalUsage * 0.1;
  return Math.round(Math.min(next, 100) * 10) / 10;
}
