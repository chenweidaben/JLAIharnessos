/**
 * 健澜科技 jlmedaios - MUSE 采纳率与使用度量 V5 单测（M285-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMuseValueV5Report,
  calculateAdoptionRateV5,
  estimateTimeSavedV5,
  rankSkillsV5,
  type UsageMetric,
} from "../../src/bff/aggregators/museValueV5Aggregator";
import { museValueV5Routes } from "../../src/bff/routes/museValueV5";

describe("calculateAdoptionRateV5", () => {
  it("采纳80/总100→80%", () => {
    expect(calculateAdoptionRateV5(80, 100)).toBe(80);
  });
  it("总数为0→0%", () => {
    expect(calculateAdoptionRateV5(0, 0)).toBe(0);
  });
});

describe("estimateTimeSavedV5", () => {
  it("100次每次5分钟→8.3小时", () => {
    expect(estimateTimeSavedV5(100, 5)).toBeCloseTo(8.3, 1);
  });
});

describe("rankSkillsV5", () => {
  it("按采纳率降序", () => {
    const metrics: UsageMetric[] = [
      { role: "r", skill: "低采纳", sessionCount: 10, adopted: 3, rejected: 7, timeSavedMin: 10 },
      { role: "r", skill: "高采纳", sessionCount: 10, adopted: 9, rejected: 1, timeSavedMin: 20 },
    ];
    expect(rankSkillsV5(metrics)[0].skill).toBe("高采纳");
  });
});

describe("buildMuseValueV5Report", () => {
  it("总采纳率=总采纳/总决策", () => {
    const metrics: UsageMetric[] = [
      { role: "r", skill: "a", sessionCount: 100, adopted: 80, rejected: 20, timeSavedMin: 60 },
      { role: "r", skill: "b", sessionCount: 100, adopted: 50, rejected: 50, timeSavedMin: 60 },
    ];
    const r = buildMuseValueV5Report(metrics);
    // 总采纳130/总决策200=65%
    expect(r.overallAdoptionRate).toBe(65);
    expect(r.totalTimeSavedHours).toBe(2);
  });
});

describe("museValueV5Routes 写权限", () => {
  it("GET /api/v1/muse-value 路由存在且 auth:true", () => {
    const route = museValueV5Routes.find((r) => r.method === "GET" && r.path === "/api/v1/muse-value");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
