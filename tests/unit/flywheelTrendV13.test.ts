/**
 * 健澜科技 jlmedaios - 飞轮季度演进趋势 V13 单测（M306-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQuarterlyFlywheelTrendV13,
  computeQuarterlyGrowthV13,
  identifyFlywheelMomentumV13,
  type QuarterlyScoreV13,
} from "../../src/bff/aggregators/flywheelTrendV13Aggregator";
import { flywheelTrendV13Routes } from "../../src/bff/routes/flywheelTrendV13";

const trend: QuarterlyScoreV13[] = [
  { quarter: "Q1", score: 55 },
  { quarter: "Q2", score: 60 },
  { quarter: "Q3", score: 63.4 },
];

describe("buildQuarterlyFlywheelTrendV13", () => {
  it("透传 3 季度", () => {
    const t = buildQuarterlyFlywheelTrendV13(trend);
    expect(t.length).toBe(3);
    expect(t[2].score).toBe(63.4);
  });
  it("空态 → 0", () => {
    expect(buildQuarterlyFlywheelTrendV13([]).length).toBe(0);
  });
});

describe("computeQuarterlyGrowthV13", () => {
  // 算式：Q3=63.4 - Q2=60 = +3.4
  it("63.4 - 60 = +3.4", () => {
    expect(computeQuarterlyGrowthV13(63.4, 60)).toBe(3.4);
  });
});

describe("identifyFlywheelMomentumV13", () => {
  // 算式：g1=60-55=5>0, g2=63.4-60=3.4>0 → 连续两季增长 → 飞轮加速
  it("55→60→63.4 → 飞轮加速", () => {
    expect(identifyFlywheelMomentumV13(trend)).toBe("飞轮加速");
  });
  // 算式：g1=50-60=-10<0, g2=40-50=-10<0 → 连续两季下降 → 飞轮失速
  it("60→50→40 → 飞轮失速", () => {
    const declining: QuarterlyScoreV13[] = [
      { quarter: "Q1", score: 60 },
      { quarter: "Q2", score: 50 },
      { quarter: "Q3", score: 40 },
    ];
    expect(identifyFlywheelMomentumV13(declining)).toBe("飞轮失速");
  });
});

describe("flywheelTrendV13Routes 读路由", () => {
  it("GET /api/v1/flywheel-trend 路由存在且 auth:true", () => {
    const route = flywheelTrendV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/flywheel-trend",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
