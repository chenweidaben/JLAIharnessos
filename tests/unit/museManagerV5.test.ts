/**
 * 健澜科技 jlmedaios - 管理者 MUSE 工作台 V5 单测（M283-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildManagerDailyV5,
  buildMuseManagerV5Report,
  detectAnomalyKpiV5,
  suggestDecisionV5,
  type KpiMetric,
} from "../../src/bff/aggregators/museManagerV5Aggregator";
import { museManagerV5Routes } from "../../src/bff/routes/museManagerV5";

describe("detectAnomalyKpiV5", () => {
  it("床位周转18/目标25→低于80%异常", () => {
    // 18/25=0.72 < 0.8
    const kpi: KpiMetric = { name: "床位周转率", value: 18, target: 25, baseline: 24 };
    expect(detectAnomalyKpiV5(kpi).anomaly).toBe(true);
  });
  it("满意度90/目标90→正常", () => {
    const kpi: KpiMetric = { name: "患者满意度", value: 90, target: 90, baseline: 88 };
    expect(detectAnomalyKpiV5(kpi).anomaly).toBe(false);
  });
});

describe("suggestDecisionV5", () => {
  it("床位周转率异常→高优先级建议", () => {
    const kpi: KpiMetric = { name: "床位周转率", value: 18, target: 25, baseline: 24 };
    expect(suggestDecisionV5(kpi).priority).toBe("high");
  });
});

describe("buildManagerDailyV5", () => {
  it("3 KPI 1异常", () => {
    const kpis: KpiMetric[] = [
      { name: "床位周转率", value: 18, target: 25, baseline: 24 },
      { name: "满意度", value: 90, target: 90, baseline: 88 },
    ];
    const r = buildManagerDailyV5("mgr-1", kpis);
    expect(r.totalKpis).toBe(2);
    expect(r.anomalyCount).toBe(1);
  });
});

describe("buildMuseManagerV5Report", () => {
  it("2管理者平均异常1.5", () => {
    const r = buildMuseManagerV5Report([{ anomalyCount: 1 }, { anomalyCount: 2 }]);
    expect(r.avgAnomalyPerManager).toBe(1.5);
  });
});

describe("museManagerV5Routes 写权限", () => {
  it("POST /api/v1/muse-manager/decision 路由存在且 auth:true", () => {
    const post = museManagerV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-manager/decision");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
