/**
 * 健澜科技 jlmedaios - MUSE A/B 测试与效果评估 V5 单测（M285-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeABV5,
  buildMuseABV5Report,
  decideWinnerV5,
  designABTestV5,
  type ABResult,
} from "../../src/bff/aggregators/museAbV5Aggregator";
import { museAbV5Routes } from "../../src/bff/routes/museAbV5";

describe("designABTestV5", () => {
  it("默认样本量400，A对照组B实验组", () => {
    const d = designABTestV5("AI建议提升采纳率", "adoption");
    expect(d.sampleSize).toBe(400);
    expect(d.variantB).toBe("实验组");
  });
});

describe("analyzeABV5", () => {
  it("B比A高10%且样本≥100→显著", () => {
    const r: ABResult = { variantA: { rate: 0.5, sample: 200 }, variantB: { rate: 0.6, sample: 200 } };
    expect(analyzeABV5(r).significant).toBe(true);
  });
  it("差异3%→不显著", () => {
    const r: ABResult = { variantA: { rate: 0.5, sample: 200 }, variantB: { rate: 0.53, sample: 200 } };
    expect(analyzeABV5(r).significant).toBe(false);
  });
});

describe("decideWinnerV5", () => {
  it("B显著更好→winner=B", () => {
    const r: ABResult = { variantA: { rate: 0.5, sample: 200 }, variantB: { rate: 0.65, sample: 200 } };
    expect(decideWinnerV5(r).winner).toBe("B");
  });
  it("不显著→平局", () => {
    const r: ABResult = { variantA: { rate: 0.5, sample: 200 }, variantB: { rate: 0.51, sample: 200 } };
    expect(decideWinnerV5(r).winner).toBe("tie");
  });
});

describe("buildMuseABV5Report", () => {
  it("2实验1平局1B胜", () => {
    const results: ABResult[] = [
      { variantA: { rate: 0.5, sample: 200 }, variantB: { rate: 0.65, sample: 200 } },
      { variantA: { rate: 0.5, sample: 200 }, variantB: { rate: 0.51, sample: 200 } },
    ];
    const r = buildMuseABV5Report(results);
    expect(r.bWins).toBe(1);
    expect(r.tieRate).toBe(50);
  });
});

describe("museAbV5Routes 写权限", () => {
  it("POST /api/v1/muse-ab/decision 路由存在且 auth:true", () => {
    const post = museAbV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-ab/decision");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
