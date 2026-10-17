/**
 * 健澜科技 jlmedaios - 多模型路由与降级 V5 纯函数（M280-A）
 *
 * routeModelV5 / fallbackChainV5 / estimateCostV5 / buildModelRouterV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 模型路由决策 */
export interface ModelRouteDecision {
  promptType: string;
  primary: string;
  fallbacks: string[];
  reason: string;
}

/** Provider 配置 */
export interface ProviderConfig {
  name: string;
  available: boolean;
  latencyP95: number;
  errorRate: number;
  costPer1kTokens: number;
}

/**
 * 模型路由 V5（纯函数）：按 prompt 类型选择主模型与降级链。
 *
 * @param prompt 用户提示
 * @param ctx 上下文（是否医疗高风险/长文本）
 * @returns 路由决策
 */
export function routeModelV5(prompt: string, ctx: { highRisk: boolean; longContext: boolean }): ModelRouteDecision {
  let primary = "general-7b";
  let reason = "通用问答";
  if (ctx.highRisk) {
    primary = "medical-70b";
    reason = "医疗高风险场景选用大模型";
  } else if (ctx.longContext) {
    primary = "longctx-32b";
    reason = "长文本上下文选用长窗模型";
  } else if (prompt.length > 200) {
    primary = "mid-13b";
    reason = "中等复杂度";
  }
  return {
    promptType: ctx.highRisk ? "medical" : ctx.longContext ? "long-context" : "general",
    primary,
    fallbacks: fallbackChainV5(primary),
    reason,
  };
}

/**
 * 降级链 V5（纯函数）：主模型失败时的备选顺序。
 *
 * @param primary 主模型
 * @returns 降级模型列表
 */
export function fallbackChainV5(primary: string): string[] {
  if (primary === "medical-70b") return ["medical-13b", "general-7b"];
  if (primary === "longctx-32b") return ["mid-13b", "general-7b"];
  if (primary === "mid-13b") return ["general-7b"];
  return [];
}

/**
 * 成本估算 V5（纯函数）：按模型单价×token数。
 *
 * @param tokens token 数
 * @param model 模型名
 * @returns 成本（元）
 */
export function estimateCostV5(tokens: number, model: string): number {
  let pricePer1k = 0.01;
  if (model === "medical-70b") pricePer1k = 0.08;
  else if (model === "longctx-32b") pricePer1k = 0.04;
  else if (model === "mid-13b") pricePer1k = 0.02;
  return Math.round((tokens / 1000) * pricePer1k * 10000) / 10000;
}

/** 模型路由看板输出 */
export interface ModelRouterV5Report {
  totalCalls: number;
  primaryDistribution: Record<string, number>;
  avgLatencyP95: number;
  totalCost: number;
  fallbackCount: number;
  suggestions: string[];
}

/**
 * 构建模型路由看板（纯函数）。
 *
 * @param providers Provider 列表
 * @param calls 调用记录
 * @returns 看板
 */
export function buildModelRouterV5Report(
  providers: ProviderConfig[],
  calls: { model: string; tokens: number; usedFallback: boolean }[],
): ModelRouterV5Report {
  const primaryDistribution: Record<string, number> = {};
  let totalCost = 0;
  let fallbackCount = 0;
  for (const c of calls) {
    primaryDistribution[c.model] = (primaryDistribution[c.model] ?? 0) + 1;
    totalCost += estimateCostV5(c.tokens, c.model);
    if (c.usedFallback) fallbackCount += 1;
  }
  const avgLatencyP95 = providers.length > 0
    ? Math.round((providers.reduce((s, p) => s + p.latencyP95, 0) / providers.length) * 10) / 10
    : 0;
  return {
    totalCalls: calls.length,
    primaryDistribution,
    avgLatencyP95,
    totalCost: Math.round(totalCost * 100) / 100,
    fallbackCount,
    suggestions: fallbackCount > 0
      ? ["存在主模型失败降级，需排查高延迟/高错误率Provider"]
      : ["模型路由稳定，成本合理"],
  };
}
