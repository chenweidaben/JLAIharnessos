/**
 * 健澜科技 jlmedaios - 综合学习飞轮健康度仪表盘 V13 单测（M310-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFlywheelHealthScoreV13,
  gradeFlywheelHealthV13,
  identifyHealthRiskV13,
  type FlywheelHealthMetricsV13,
} from "../../src/bff/aggregators/flywheelHealthV13Aggregator";
import { flywheelHealthV13Routes } from "../../src/bff/routes/flywheelHealthV13";

const metrics: FlywheelHealthMetricsV13 = {
  adoptionRate: 70,
  closureRate: 65,
  dualSedimentRate: 60,
  milestoneRate: 75,
};

describe("computeFlywheelHealthScoreV13", () => {
  // 算式：70×0.3 + 65×0.25 + 60×0.2 + 75×0.25
  //     = 21 + 16.25 + 12 + 18.75 = 68.0
  it("健康分 = 68.0", () => {
    expect(computeFlywheelHealthScoreV13(metrics)).toBe(68);
  });
});

describe("gradeFlywheelHealthV13", () => {
  // 算式：60 ≤ 68 < 80 → 黄灯
  it("68 → 黄灯", () => {
    expect(gradeFlywheelHealthV13(68)).toBe("黄灯");
  });
  it("85 → 绿灯", () => {
    expect(gradeFlywheelHealthV13(85)).toBe("绿灯");
  });
  it("50 → 红灯", () => {
    expect(gradeFlywheelHealthV13(50)).toBe("红灯");
  });
});

describe("identifyHealthRiskV13", () => {
  // 算式：grade=红灯, score=50 → 需紧急介入
  it("红灯 + 50 → 紧急介入", () => {
    expect(identifyHealthRiskV13(50, "红灯")).toContain("紧急介入");
  });
  it("黄灯 → 无明显风险", () => {
    expect(identifyHealthRiskV13(68, "黄灯")).toBe("无明显风险");
  });
});

describe("flywheelHealthV13Routes 读路由", () => {
  it("GET /api/v1/flywheel-health 路由存在且 auth:true", () => {
    const route = flywheelHealthV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/flywheel-health",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
