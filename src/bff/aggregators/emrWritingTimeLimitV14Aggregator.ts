/**
 * 健澜科技 jlmedaios - 病历书写时限管控 V14 聚合器（M527-A）
 *
 * 纯函数：构建时限管控基础数据 + 时限检查 + 构建时限报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 时限管控基础数据 */
export interface WritingTimeLimitV14 {
  recordType: string;
  deadlineHours: number;
}

/** 时限检查输入 */
export interface WritingTimeLimitInputV14 {
  recordType: string;
  elapsedHours: number;
  deadlineHours: number;
}

/** 时限检查结果 */
export interface WritingTimeLimitResultV14 {
  onTime: boolean;
  overdueHours: number;
}

/** 时限报告 */
export interface WritingTimeLimitReportV14 {
  onTime: boolean;
  overdueHours: number;
}

/**
 * 构建时限管控基础数据。
 *
 * @param recordType 病历类型
 * @param deadlineHours 时限小时数
 * @returns 时限管控基础数据
 */
export function buildWritingTimeLimit(recordType: string, deadlineHours: number): WritingTimeLimitV14 {
  return { recordType, deadlineHours };
}

/**
 * 时限检查。
 * onTime = elapsedHours <= deadlineHours；overdueHours = Math.max(0, elapsedHours - deadlineHours)。
 *
 * @param input 时限检查输入（病历类型 + 已用小时 + 时限小时）
 * @returns 检查结果（onTime + overdueHours）
 */
export function checkWritingDeadline(input: WritingTimeLimitInputV14): WritingTimeLimitResultV14 {
  // 手算：onTime = elapsedHours <= deadlineHours
  // 测试2：elapsedHours=18 <= deadlineHours=24 → onTime=true
  // 测试3：elapsedHours=30 <= deadlineHours=24 → onTime=false
  const onTime = input.elapsedHours <= input.deadlineHours;
  // 手算：overdueHours = Math.max(0, elapsedHours - deadlineHours)
  // 测试2：Math.max(0, 18-24) = Math.max(0, -6) = 0
  // 测试3：Math.max(0, 30-24) = Math.max(0, 6) = 6
  const overdueHours = Math.max(0, input.elapsedHours - input.deadlineHours);
  return { onTime, overdueHours };
}

/**
 * 构建时限报告。
 *
 * @param result 时限检查结果
 * @returns 时限报告（onTime + overdueHours 透传）
 */
export function buildWritingTimeLimitReport(result: WritingTimeLimitResultV14): WritingTimeLimitReportV14 {
  // 手算：透传 onTime + overdueHours
  // 测试4：{onTime:false, overdueHours:6} → onTime=false, overdueHours=6
  return { onTime: result.onTime, overdueHours: result.overdueHours };
}
