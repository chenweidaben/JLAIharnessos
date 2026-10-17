/**
 * 健澜科技 jlmedaios - MUSE 投入产出报告 V13 纯函数（M321-D）
 *
 * computeRoiSummaryV13 / computeWorkHourSavedV13 / nextMonthProjectionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ROI 汇总数据 */
export interface RoiSummaryV13 {
  totalCalls: number;
  adverseEventsReduced: number;
  adoptedSuggestions: number;
}

/** 历史月度数据 */
export interface RoiHistoryV13 {
  month: string;
  calls: number;
}

/** ROI 汇总结果 */
export interface RoiSummaryResultV13 {
  totalCalls: number;
  workHoursSaved: number;
  adverseEventsReduced: number;
  adoptedSuggestions: number;
}

/**
 * ROI 汇总（纯函数）：累计调用量/节省工时/不良事件下降数/建议采纳转化数。
 *
 * @param data ROI 汇总数据
 * @param minutesPerCall 每次节省分钟数
 * @returns ROI 汇总结果
 */
export function computeRoiSummaryV13(data: RoiSummaryV13, minutesPerCall: number): RoiSummaryResultV13 {
  return {
    totalCalls: data.totalCalls,
    workHoursSaved: Math.round((data.totalCalls * minutesPerCall) / 60),
    adverseEventsReduced: data.adverseEventsReduced,
    adoptedSuggestions: data.adoptedSuggestions,
  };
}

/**
 * 节省工时（纯函数）：调用量×每次节省分钟/60。
 *
 * @param calls 调用量
 * @param minutesPerCall 每次节省分钟数
 * @returns 节省工时小时数（四舍五入）
 */
export function computeWorkHourSavedV13(calls: number, minutesPerCall: number): number {
  return Math.round((calls * minutesPerCall) / 60);
}

/**
 * 下月预测（纯函数）：按近 3 月均值线性外推。
 *
 * @param history 历史月度数据列表
 * @returns 下月预测调用量
 */
export function nextMonthProjectionV13(history: RoiHistoryV13[]): number {
  if (history.length === 0) return 0;
  const recent = history.slice(-3);
  const avg = recent.reduce((sum, h) => sum + h.calls, 0) / recent.length;
  return Math.round(avg);
}
