/**
 * 健澜科技 jlmedaios - 多模型路由与降级 V5 单测（M280-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildModelRouterV5Report,
  estimateCostV5,
  fallbackChainV5,
  routeModelV5,
  type ProviderConfig,
} from "../../src/bff/aggregators/modelRouterV5Aggregator";

describe("routeModelV5", () => {
  it("医疗高风险→medical-70b", () => {
    expect(routeModelV5("胸痛诊断", { highRisk: true, longContext: false }).primary).toBe("medical-70b");
  });
  it("长上下文→longctx-32b", () => {
    expect(routeModelV5("病历摘要", { highRisk: false, longContext: true }).primary).toBe("longctx-32b");
  });
  it("普通短问→general-7b", () => {
    expect(routeModelV5("你好", { highRisk: false, longContext: false }).primary).toBe("general-7b");
  });
});

describe("fallbackChainV5", () => {
  it("medical-70b降级到medical-13b再到general-7b", () => {
    expect(fallbackChainV5("medical-70b")).toEqual(["medical-13b", "general-7b"]);
  });
});

describe("estimateCostV5", () => {
  it("1000 tokens medical-70b→0.08元", () => {
    expect(estimateCostV5(1000, "medical-70b")).toBe(0.08);
  });
});

describe("buildModelRouterV5Report", () => {
  it("统计调用、成本与降级", () => {
    const providers: ProviderConfig[] = [
      { name: "m1", available: true, latencyP95: 1000, errorRate: 0.01, costPer1kTokens: 0.08 },
    ];
    const calls = [
      { model: "medical-70b", tokens: 1000, usedFallback: false },
      { model: "general-7b", tokens: 1000, usedFallback: true },
    ];
    const r = buildModelRouterV5Report(providers, calls);
    expect(r.totalCalls).toBe(2);
    expect(r.fallbackCount).toBe(1);
    expect(r.totalCost).toBeCloseTo(0.09, 2);
  });
});
