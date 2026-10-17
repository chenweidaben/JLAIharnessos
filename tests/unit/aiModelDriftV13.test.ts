/**
 * 健澜科技 jlmedaios - AI 模型漂移监控 V13 单测（M325-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDriftReportV13,
  computeKLDivergenceV13,
  detectDriftAlertV13,
  type DistributionV13,
} from "../../src/bff/aggregators/aiModelDriftV13Aggregator";
import { aiModelDriftV13Routes } from "../../src/bff/routes/aiModelDriftV13";

const current: DistributionV13[] = [
  { bin: "low", probability: 0.5 },
  { bin: "mid", probability: 0.3 },
  { bin: "high", probability: 0.2 },
];

const baseline: DistributionV13[] = [
  { bin: "low", probability: 0.4 },
  { bin: "mid", probability: 0.4 },
  { bin: "high", probability: 0.2 },
];

describe("computeKLDivergenceV13", () => {
  // 算式：KL = 0.5*ln(0.5/0.4) + 0.3*ln(0.3/0.4) + 0.2*ln(0.2/0.2)
  //       = 0.5*0.223 + 0.3*(-0.288) + 0
  //       = 0.1115 - 0.0864 = 0.0251 → round 2 = 0.03
  it("KL = 0.03", () => {
    expect(computeKLDivergenceV13(current, baseline)).toBe(0.03);
  });
  it("空态 → 0", () => {
    expect(computeKLDivergenceV13([], [])).toBe(0);
  });
});

describe("detectDriftAlertV13", () => {
  // 算式：0.03 < 0.1 → green
  it("KL=0.03 → green", () => {
    expect(detectDriftAlertV13(0.03)).toBe("green");
  });
  // 算式：0.15 > 0.1 → red
  it("KL=0.15 → red", () => {
    expect(detectDriftAlertV13(0.15)).toBe("red");
  });
});

describe("buildDriftReportV13", () => {
  // 算式：KL=0.03, alert=green
  it("报告 = KL 0.03 + green", () => {
    const report = buildDriftReportV13(current, baseline);
    expect(report.klValue).toBe(0.03);
    expect(report.alert).toBe("green");
  });
});

describe("aiModelDriftV13Routes 读路由", () => {
  it("GET /api/v1/ai-model-drift 路由存在且 auth:true", () => {
    const route = aiModelDriftV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ai-model-drift",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
