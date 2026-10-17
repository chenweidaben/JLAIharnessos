/**
 * 健澜科技 jlmedaios - 医疗质量总仪表盘 V13 单测（M322-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQualityDashboardV13,
  computeQualityIndicatorsV13,
  gradeQualityIndicatorV13,
  type QualityDashboardInputV13,
} from "../../src/bff/aggregators/clinicalQualityDashboardV13Aggregator";
import { clinicalQualityDashboardV13Routes } from "../../src/bff/routes/clinicalQualityDashboardV13";

const data: QualityDashboardInputV13 = {
  cmi: 1.2,
  avgStayDays: 8.5,
  bedTurnover: 3.2,
  threeDayDiagnosisRate: 92,
};

describe("computeQualityIndicatorsV13", () => {
  it("返回 4 大指标值", () => {
    const result = computeQualityIndicatorsV13(data);
    expect(result.cmi).toBe(1.2);
    expect(result.avgStayDays).toBe(8.5);
    expect(result.bedTurnover).toBe(3.2);
    expect(result.threeDayDiagnosisRate).toBe(92);
  });
});

describe("gradeQualityIndicatorV13", () => {
  // 算式：CMI=1.2 ≥1.0 → green
  it("CMI=1.2 → green", () => {
    expect(gradeQualityIndicatorV13("cmi", 1.2)).toBe("green");
  });
  // 算式：平均住院日=8.5 在 7-10 → yellow
  it("avgStayDays=8.5 → yellow", () => {
    expect(gradeQualityIndicatorV13("avgStayDays", 8.5)).toBe("yellow");
  });
  // 算式：床位周转率=3.2 ≥3 → green
  it("bedTurnover=3.2 → green", () => {
    expect(gradeQualityIndicatorV13("bedTurnover", 3.2)).toBe("green");
  });
  // 算式：三日确诊率=92 ≥90 → green
  it("threeDayDiagnosisRate=92 → green", () => {
    expect(gradeQualityIndicatorV13("threeDayDiagnosisRate", 92)).toBe("green");
  });
});

describe("buildQualityDashboardV13", () => {
  it("返回 4 个指标 + 灯色", () => {
    const dashboard = buildQualityDashboardV13(data);
    expect(dashboard.indicators.length).toBe(4);
    expect(dashboard.indicators[0].name).toBe("CMI");
    expect(dashboard.indicators[0].light).toBe("green");
    expect(dashboard.indicators[1].light).toBe("yellow");
  });
});

describe("clinicalQualityDashboardV13Routes 读路由", () => {
  it("GET /api/v1/clinical-quality-dashboard 路由存在且 auth:true", () => {
    const route = clinicalQualityDashboardV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-quality-dashboard",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
