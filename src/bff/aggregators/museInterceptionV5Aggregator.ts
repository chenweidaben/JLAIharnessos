/**
 * 健澜科技 jlmedaios - MUSE 错误拦截与风险避免 V5 纯函数（M285-B）
 *
 * countInterceptionV5 / estimateAvoidedHarmV5 / rankRiskV5 / buildMuseInterceptionV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 拦截事件 */
export interface InterceptionEvent {
  riskType: string;
  intercepted: boolean;
  avoidedHarm: number;
  seriousness: "low" | "medium" | "high";
}

/**
 * 拦截计数 V5（纯函数）：统计已拦截事件数。
 *
 * @param events 事件列表
 * @returns 拦截数
 */
export function countInterceptionV5(events: InterceptionEvent[]): number {
  return events.filter((e) => e.intercepted).length;
}

/**
 * 避免损害估算 V5（纯函数）：按 serious 加权求和。
 *
 * @param interceptions 拦截事件
 * @returns 估算损害值
 */
export function estimateAvoidedHarmV5(interceptions: InterceptionEvent[]): number {
  const weight = { low: 1, medium: 5, high: 20 };
  return interceptions
    .filter((e) => e.intercepted)
    .reduce((s, e) => s + e.avoidedHarm * weight[e.seriousness], 0);
}

/**
 * 风险类型排行 V5（纯函数）：按损害值降序。
 *
 * @param events 事件列表
 * @returns 排行
 */
export function rankRiskV5(events: InterceptionEvent[]): { riskType: string; avoidedHarm: number }[] {
  const byType = new Map<string, number>();
  for (const e of events) {
    if (!e.intercepted) continue;
    byType.set(e.riskType, (byType.get(e.riskType) ?? 0) + e.avoidedHarm);
  }
  return Array.from(byType.entries())
    .map(([riskType, avoidedHarm]) => ({ riskType, avoidedHarm }))
    .sort((a, b) => b.avoidedHarm - a.avoidedHarm);
}

/** 拦截看板输出 */
export interface MuseInterceptionV5Report {
  totalEvents: number;
  interceptedCount: number;
  avoidedHarmTotal: number;
  topRisk: string;
}

/**
 * 构建拦截看板（纯函数）。
 *
 * @param events 事件列表
 * @returns 看板
 */
export function buildMuseInterceptionV5Report(events: InterceptionEvent[]): MuseInterceptionV5Report {
  const ranked = rankRiskV5(events);
  return {
    totalEvents: events.length,
    interceptedCount: countInterceptionV5(events),
    avoidedHarmTotal: estimateAvoidedHarmV5(events),
    topRisk: ranked[0]?.riskType ?? "—",
  };
}
