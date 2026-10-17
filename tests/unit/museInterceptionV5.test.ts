/**
 * 健澜科技 jlmedaios - MUSE 错误拦截与风险避免 V5 单测（M285-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMuseInterceptionV5Report,
  countInterceptionV5,
  estimateAvoidedHarmV5,
  rankRiskV5,
  type InterceptionEvent,
} from "../../src/bff/aggregators/museInterceptionV5Aggregator";
import { museInterceptionV5Routes } from "../../src/bff/routes/museInterceptionV5";

describe("countInterceptionV5", () => {
  it("2条已拦截1条未拦截→2", () => {
    const events: InterceptionEvent[] = [
      { riskType: "a", intercepted: true, avoidedHarm: 1, seriousness: "low" },
      { riskType: "b", intercepted: true, avoidedHarm: 1, seriousness: "low" },
      { riskType: "c", intercepted: false, avoidedHarm: 1, seriousness: "low" },
    ];
    expect(countInterceptionV5(events)).toBe(2);
  });
});

describe("estimateAvoidedHarmV5", () => {
  it("high加权20，medium加权5：10×20+5×5=225", () => {
    const events: InterceptionEvent[] = [
      { riskType: "a", intercepted: true, avoidedHarm: 10, seriousness: "high" },
      { riskType: "b", intercepted: true, avoidedHarm: 5, seriousness: "medium" },
      { riskType: "c", intercepted: false, avoidedHarm: 100, seriousness: "high" },
    ];
    expect(estimateAvoidedHarmV5(events)).toBe(225);
  });
});

describe("rankRiskV5", () => {
  it("按损害值降序", () => {
    const events: InterceptionEvent[] = [
      { riskType: "低", intercepted: true, avoidedHarm: 1, seriousness: "low" },
      { riskType: "高", intercepted: true, avoidedHarm: 20, seriousness: "high" },
    ];
    expect(rankRiskV5(events)[0].riskType).toBe("高");
  });
});

describe("buildMuseInterceptionV5Report", () => {
  it("topRisk取最高损害类型", () => {
    const events: InterceptionEvent[] = [
      { riskType: "相互作用", intercepted: true, avoidedHarm: 10, seriousness: "high" },
      { riskType: "剂量", intercepted: true, avoidedHarm: 5, seriousness: "medium" },
    ];
    expect(buildMuseInterceptionV5Report(events).topRisk).toBe("相互作用");
  });
});

describe("museInterceptionV5Routes 写权限", () => {
  it("GET /api/v1/muse-interception 路由存在且 auth:true", () => {
    const route = museInterceptionV5Routes.find((r) => r.method === "GET" && r.path === "/api/v1/muse-interception");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
