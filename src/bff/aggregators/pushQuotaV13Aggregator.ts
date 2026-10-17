/**
 * 健澜科技 jlmedaios - 推送频控与免打扰 V13 纯函数（M302-C）
 *
 * computePushQuotaV13 / filterWithinQuotaV13 / buildDndWindowV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 配额候选 */
export interface QuotaPushV13 {
  experienceId: string;
  title: string;
}

/** 免打扰窗口 */
export interface DndWindowV13 {
  startHour: number;
  endHour: number;
  description: string;
}

/**
 * 每日配额（纯函数）：接诊>60→8；30-60→5；<30→3。
 *
 * @param doctorLoad 每日接诊数
 * @returns 推送配额
 */
export function computePushQuotaV13(doctorLoad: number): number {
  if (doctorLoad > 60) return 8;
  if (doctorLoad >= 30) return 5;
  return 3;
}

/**
 * 配额截取（纯函数）：只保留前 quota 条。
 *
 * @param pushList 推送列表
 * @param quota 配额
 * @returns 截取后列表
 */
export function filterWithinQuotaV13(pushList: QuotaPushV13[], quota: number): QuotaPushV13[] {
  return pushList.slice(0, quota);
}

/**
 * 免打扰窗口（纯函数）：默认 22:00-07:00 不推。
 *
 * @param quietHours 自定义免打扰时段（默认 start=22, end=7）
 * @returns 窗口
 */
export function buildDndWindowV13(
  quietHours: { startHour: number; endHour: number } = { startHour: 22, endHour: 7 },
): DndWindowV13 {
  return {
    startHour: quietHours.startHour,
    endHour: quietHours.endHour,
    description: `${quietHours.startHour}:00 - ${quietHours.endHour}:00 不推送`,
  };
}
