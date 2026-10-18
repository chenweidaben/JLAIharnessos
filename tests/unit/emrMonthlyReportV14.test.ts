/**
 * 健澜科技 jlmedaios - 病历质控月度报告自动生成 V14 单测（M466-D）
 *
 * 测试 buildMonthlyReport 合格率/得分计算、computeTrend 环比趋势、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMonthlyReport,
  computeTrend,
} from "../../src/bff/aggregators/emrMonthlyReportV14Aggregator";
import { emrMonthlyReportV14Routes } from "../../src/bff/routes/emrMonthlyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMonthlyReport 合格率", () => {
  // 手算：100 份病历 95 通过 → 95/100×100 = 95.00%
  it("100 份病历 95 通过 → 合格率=95.00%", () => {
    const report = buildMonthlyReport("2026-10", {
      totalRecords: 100,
      passCount: 95,
      blockCount: 0,
      majorCount: 0,
      minorCount: 0,
    });
    expect(report.passRate).toBe(95);
  });
});

describe("buildMonthlyReport 得分", () => {
  // 手算：2 block + 1 major → 100 - 2×15 - 1×8 = 100 - 30 - 8 = 62
  it("2 block+1 major → 得分=100-30-8=62", () => {
    const report = buildMonthlyReport("2026-10", {
      totalRecords: 100,
      passCount: 95,
      blockCount: 2,
      majorCount: 1,
      minorCount: 0,
    });
    expect(report.score).toBe(62);
  });
});

describe("computeTrend 上升", () => {
  // 手算：本月 95，上月 90 → change = 95 - 90 = 5 > 0 → direction='up'
  it("本月 95 上月 90 → change=5，direction='up'", () => {
    const trend = computeTrend(95, 90);
    expect(trend.change).toBe(5);
    expect(trend.direction).toBe("up");
  });
});

describe("computeTrend 下降", () => {
  // 手算：本月 88，上月 92 → change = 88 - 92 = -4 < 0 → direction='down'
  it("本月 88 上月 92 → change=-4，direction='down'", () => {
    const trend = computeTrend(88, 92);
    expect(trend.change).toBe(-4);
    expect(trend.direction).toBe("down");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-monthly-report/:yearMonth auth:true", () => {
    const def = (emrMonthlyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-monthly-report/:yearMonth");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
