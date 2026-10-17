/**
 * 健澜科技 jlmedaios - 患者等候时长 V13 纯函数（M326-A）
 *
 * computeWaitTimeByStageV13 / flagOverdueStageV13 / buildWaitTimeOverviewV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 等候记录 */
export interface WaitTimeRecordV13 {
  stage: "registration" | "waiting" | "payment" | "pharmacy";
  minutes: number;
}

/** 环节时长项 */
export interface StageWaitItemV13 {
  stage: string;
  avgMinutes: number;
  isOverdue: boolean;
}

/**
 * 4 环节平均时长（纯函数）：挂号/候诊/缴费/取药 各环节均值，分钟。
 *
 * @param records 等候记录列表
 * @returns 各环节平均时长
 */
export function computeWaitTimeByStageV13(records: WaitTimeRecordV13[]): StageWaitItemV13[] {
  const stages: WaitTimeRecordV13["stage"][] = ["registration", "waiting", "payment", "pharmacy"];
  return stages.map((stage) => {
    const items = records.filter((r) => r.stage === stage);
    const avg = items.length === 0 ? 0 : Math.round((items.reduce((acc, r) => acc + r.minutes, 0) / items.length) * 10) / 10;
    return { stage, avgMinutes: avg, isOverdue: flagOverdueStageV13(stage, avg) };
  });
}

/**
 * 红牌判定（纯函数）：>30 分钟红牌。
 *
 * @param stage 环节名
 * @param minutes 时长（分钟）
 * @returns 是否红牌
 */
export function flagOverdueStageV13(stage: string, minutes: number): boolean {
  return minutes > 30;
}

/**
 * 总览（纯函数）：4 环节时长 + 红牌标记。
 *
 * @param records 等候记录列表
 * @returns 总览
 */
export function buildWaitTimeOverviewV13(records: WaitTimeRecordV13[]): { stages: StageWaitItemV13[] } {
  return { stages: computeWaitTimeByStageV13(records) };
}
