/**
 * 健澜科技 jlmedaios - 病历时效性检查 V14 聚合器（M476-C）
 *
 * 纯函数：时限合规识别 + 时效性得分计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病历时限记录 */
export interface TimelinessRecordV14 {
  name: string;
  deadlineHours: number;
  actualHours: number;
}

/** 时效性检查结果 */
export interface TimelinessResultV14 {
  compliant: number;
  overdue: number;
  total: number;
  score: number;
  overdueItems: string[];
}

/**
 * 检查病历时限合规：actualHours<=deadlineHours 视为合规，否则超时。
 *
 * @param records 时限记录列表
 * @returns 时效性检查结果
 */
export function checkTimeliness(records: TimelinessRecordV14[]): TimelinessResultV14 {
  const overdueItems = records.filter((r) => r.actualHours > r.deadlineHours).map((r) => r.name);
  const overdue = overdueItems.length;
  const total = records.length;
  const compliant = total - overdue;
  const score = computeTimelinessScore({ compliant, total });
  return { compliant, overdue, total, score, overdueItems };
}

/**
 * 计算时效性得分：score=compliant/total×100（整数，向上取整）。
 *
 * @param result 含 compliant/total 的对象
 * @returns 时效性得分（0-100）
 */
export function computeTimelinessScore(result: { compliant: number; total: number }): number {
  if (result.total === 0) return 0;
  return Math.ceil((result.compliant / result.total) * 100);
}
