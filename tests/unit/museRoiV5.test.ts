/**
 * 健澜科技 jlmedaios - MUSE 成本与 ROI 分析 V5 单测（M285-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMuseROIV5Report,
  calculateAICostV5,
  estimateROIV5,
  optimizeModelMixV5,
  type CostEntry,
} from "../../src/bff/aggregators/museRoiV5Aggregator";
import { museRoiV5Routes } from "../../src/bff/routes/museRoiV5";

describe("calculateAICostV5", () => {
  it("gpt-4: 100k输入+50k输出→6元", () => {
    // (100000/1000)*0.03 + (50000/1000)*0.06 = 3 + 3 = 6
    expect(calculateAICostV5(100000, 50000, "gpt-4")).toBeCloseTo(6, 2);
  });
  it("deepseek默认: 100k输入+50k输出→0.2元", () => {
    // 100*0.001 + 50*0.002 = 0.1 + 0.1 = 0.2
    expect(calculateAICostV5(100000, 50000, "deepseek")).toBeCloseTo(0.2, 3);
  });
});

describe("estimateROIV5", () => {
  it("成本6节省60→ROI=900%", () => {
    expect(estimateROIV5(6, 60)).toBe(900);
  });
  it("成本0→0", () => {
    expect(estimateROIV5(0, 60)).toBe(0);
  });
});

describe("optimizeModelMixV5", () => {
  it("gpt-4条目替换deepseek节省≈5.8元", () => {
    const entries: CostEntry[] = [
      { model: "gpt-4", tokenIn: 100000, tokenOut: 50000, costCny: 6, savedValueCny: 60 },
    ];
    expect(optimizeModelMixV5(entries).savings).toBeCloseTo(5.8, 1);
  });
});

describe("buildMuseROIV5Report", () => {
  it("总费用6.4总节省100→ROI=1462.5%", () => {
    const entries: CostEntry[] = [
      { model: "gpt-4", tokenIn: 0, tokenOut: 0, costCny: 6, savedValueCny: 60 },
      { model: "deepseek", tokenIn: 0, tokenOut: 0, costCny: 0.4, savedValueCny: 40 },
    ];
    // (100 - 6.4) / 6.4 = 93.6 / 6.4 = 14.625 → 1462.5%
    expect(buildMuseROIV5Report(entries, 1000).overallROI).toBeCloseTo(1462.5, 1);
  });
});

describe("museRoiV5Routes 写权限", () => {
  it("GET /api/v1/muse-roi 路由存在且 auth:true", () => {
    const route = museRoiV5Routes.find((r) => r.method === "GET" && r.path === "/api/v1/muse-roi");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
