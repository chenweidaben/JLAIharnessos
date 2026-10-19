/**
 * 健澜科技 jlmedaios - 病历AI医嘱执行追踪 V14 聚合器（M558-C）
 *
 * 纯函数：构建 AI 医嘱执行追踪基础数据 + AI 医嘱执行追踪 + 构建医嘱执行追踪报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 医嘱执行追踪基础数据 */
export interface AiOrderExecTrackV14 {
  recordId: string;
  dept: string;
}

/** AI 医嘱执行追踪输入 */
export interface AiOrderExecTrackInputV14 {
  totalOrders: number;
  executedOrders: number;
  overdueOrders: number;
}

/** AI 医嘱执行追踪结果 */
export interface AiOrderExecTrackResultV14 {
  execRate: number;
  overdueRate: number;
  status: string;
}

/** 医嘱执行追踪报告 */
export interface AiOrderExecTrackReportV14 {
  execRate: number;
  overdueRate: number;
  status: string;
}

/**
 * 构建 AI 医嘱执行追踪基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 医嘱执行追踪基础数据
 */
export function buildAiOrderExecTrack(recordId: string, dept: string): AiOrderExecTrackV14 {
  return { recordId, dept };
}

/**
 * AI 医嘱执行追踪。
 * execRate = Math.round(executedOrders / totalOrders * 1000) / 10
 * overdueRate = Math.round(overdueOrders / totalOrders * 1000) / 10
 * status = overdueRate > 10 ? '存在逾期风险' : execRate >= 95 ? '执行良好' : '执行待改进'
 *
 * @param input 医嘱追踪输入（总医嘱数 + 已执行数 + 逾期数）
 * @returns 医嘱追踪结果（execRate + overdueRate + status）
 */
export function trackOrderExecByAi(input: AiOrderExecTrackInputV14): AiOrderExecTrackResultV14 {
  // 手算：execRate = Math.round(executedOrders / totalOrders * 1000) / 10
  // 测试2：98/100*1000 = 980 → Math.round(980)/10 = 98.0
  // 测试3：85/100*1000 = 850 → Math.round(850)/10 = 85.0
  const execRate = Math.round((input.executedOrders / input.totalOrders) * 1000) / 10;
  // 手算：overdueRate = Math.round(overdueOrders / totalOrders * 1000) / 10
  // 测试2：2/100*1000 = 20 → Math.round(20)/10 = 2.0
  // 测试3：15/100*1000 = 150 → Math.round(150)/10 = 15.0
  const overdueRate = Math.round((input.overdueOrders / input.totalOrders) * 1000) / 10;
  // 手算：status = overdueRate > 10 ? '存在逾期风险' : execRate >= 95 ? '执行良好' : '执行待改进'
  // 测试2：overdueRate=2.0>10=false, execRate=98.0>=95=true → '执行良好'
  // 测试3：overdueRate=15.0>10=true → '存在逾期风险'
  const status = overdueRate > 10 ? "存在逾期风险" : execRate >= 95 ? "执行良好" : "执行待改进";
  return { execRate, overdueRate, status };
}

/**
 * 构建医嘱执行追踪报告。
 *
 * @param result 医嘱追踪结果
 * @returns 医嘱追踪报告（execRate + overdueRate + status 透传）
 */
export function buildAiOrderExecTrackReport(result: AiOrderExecTrackResultV14): AiOrderExecTrackReportV14 {
  // 手算：透传 execRate + overdueRate + status
  // 测试4：{execRate=98.0, overdueRate=2.0, status='执行良好'} → 透传
  return { execRate: result.execRate, overdueRate: result.overdueRate, status: result.status };
}
