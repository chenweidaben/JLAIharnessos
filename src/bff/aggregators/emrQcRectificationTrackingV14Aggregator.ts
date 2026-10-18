/**
 * 健澜科技 jlmedaios - 病历整改自动跟踪 V14 聚合器（M521-D，M521 收官）
 *
 * 纯函数：构建整改跟踪基础数据 + 跟踪整改 + 构建跟踪报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 整改跟踪基础数据 */
export interface RectificationTrackingV14 {
  defectId: string;
  owner: string;
  deadlineDays: number;
}

/** 跟踪结果 */
export interface RectificationTrackResultV14 {
  status: string;
  daysRemaining: number;
}

/** 跟踪报告 */
export interface RectificationTrackReportV14 {
  status: string;
  daysRemaining: number;
}

/**
 * 构建整改跟踪基础数据。
 *
 * @param defectId 缺陷ID
 * @param owner 负责人
 * @param deadlineDays 期限天数
 * @returns 整改跟踪基础数据
 */
export function buildRectificationTracking(defectId: string, owner: string, deadlineDays: number): RectificationTrackingV14 {
  return { defectId, owner, deadlineDays };
}

/**
 * 跟踪整改。
 * completed=true→status='已完成'；daysElapsed>=deadlineDays→status='已逾期'；否则 daysRemaining=deadlineDays-daysElapsed, status='进行中'。
 *
 * @param tracking 整改跟踪基础数据
 * @param daysElapsed 已过天数
 * @param completed 是否完成
 * @returns 跟踪结果（status + daysRemaining）
 */
export function trackRectification(tracking: RectificationTrackingV14, daysElapsed: number, completed: boolean): RectificationTrackResultV14 {
  // 手算：completed=true → status='已完成'
  if (completed) {
    return { status: "已完成", daysRemaining: 0 };
  }
  // 手算：daysElapsed >= deadlineDays → status='已逾期'
  if (daysElapsed >= tracking.deadlineDays) {
    return { status: "已逾期", daysRemaining: 0 };
  }
  // 手算：否则 daysRemaining = deadlineDays - daysElapsed, status='进行中'
  const daysRemaining = tracking.deadlineDays - daysElapsed;
  return { status: "进行中", daysRemaining };
}

/**
 * 构建跟踪报告。
 *
 * @param result 跟踪结果
 * @returns 跟踪报告（status + daysRemaining）
 */
export function buildRectificationTrackingReport(result: RectificationTrackResultV14): RectificationTrackReportV14 {
  return { status: result.status, daysRemaining: result.daysRemaining };
}
