/**
 * 健澜科技 jlmedaios - 电子病历等级评审仪表盘 V14 单测（M462-D）
 *
 * 测试 computeGradeProgress 四项均90→overall=90、四项不同值加权平均、getGradeLevel(90)→6级、getGradeLevel(70)→5级、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeGradeProgress,
  getGradeLevel,
  type GradeMetricsV14,
} from "../../src/bff/aggregators/emrGradeDashboardV14Aggregator";
import { emrGradeDashboardV14Routes } from "../../src/bff/routes/emrGradeDashboardV14";
import type { RouteDef } from "../../src/bff/types";

describe("computeGradeProgress 四项均90", () => {
  // 手算：(90+90+90+90)/4 = 360/4 = 90
  it("四项均 90 → overall=90", () => {
    const metrics: GradeMetricsV14 = {
      structuredRate: 90,
      closedLoopRate: 90,
      sharingRate: 90,
      qcCoverageRate: 90,
    };
    const result = computeGradeProgress(metrics);
    expect(result.overall).toBe(90);
  });
});

describe("computeGradeProgress 四项不同值", () => {
  // 手算：(80+70+60+50)/4 = 260/4 = 65
  it("四项不同值 → 加权平均 65", () => {
    const metrics: GradeMetricsV14 = {
      structuredRate: 80,
      closedLoopRate: 70,
      sharingRate: 60,
      qcCoverageRate: 50,
    };
    const result = computeGradeProgress(metrics);
    expect(result.overall).toBe(65);
  });
});

describe("getGradeLevel 90", () => {
  // 手算：90 >= 90 → '6级'
  it("overall=90 → '6级'", () => {
    expect(getGradeLevel(90)).toBe("6级");
  });
});

describe("getGradeLevel 70", () => {
  // 手算：70 >= 70 且 < 90 → '5级'
  it("overall=70 → '5级'", () => {
    expect(getGradeLevel(70)).toBe("5级");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-grade-dashboard auth:true", () => {
    const def = (emrGradeDashboardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-grade-dashboard");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
