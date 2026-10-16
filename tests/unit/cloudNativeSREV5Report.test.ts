/**
 * 健澜科技 jlmedaios - 云原生 SRE 深化 V5 纯函数单测（M260-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCloudNativeSREV5Report,
  calculateErrorBudgetV5,
  designChaosExperimentV5,
} from "../../src/bff/aggregators/cloudNativeSREV5ReportAggregator";

describe("calculateErrorBudgetV5", () => {
  it("SLO99%+消耗20% → 剩余健康", () => {
    expect(calculateErrorBudgetV5(99, 0.2).health).toBe("健康");
  });
});

describe("designChaosExperimentV5", () => {
  it("单实例爆炸半径 → 批准5分钟恢复", () => {
    expect(designChaosExperimentV5("payment-svc", "单实例").approved).toBe(true);
  });
});

describe("buildCloudNativeSREV5Report", () => {
  it("生成SLO数据", () => {
    const r = buildCloudNativeSREV5Report("30d");
    expect(r.slo.availability).toBeGreaterThan(0);
  });

  it("生成可观测数据", () => {
    const r = buildCloudNativeSREV5Report("30d");
    expect(r.observability.metrics).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCloudNativeSREV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
