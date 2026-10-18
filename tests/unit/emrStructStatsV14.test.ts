/**
 * 健澜科技 jlmedaios - 病历结构化数据统计 V14 单测（M532-C）
 *
 * 测试 buildStructStats 构建统计、computeStructStats 结构化统计、buildStructStatsReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStructStats,
  buildStructStatsReport,
  computeStructStats,
  type StructStatsInputV14,
} from "../../src/bff/aggregators/emrStructStatsV14Aggregator";
import { emrStructStatsV14Routes } from "../../src/bff/routes/emrStructStatsV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStructStats 构建统计", () => {
  // 手算：dept='心内科', period='2026-Q3' → 正确构建
  it("dept='心内科', period='2026-Q3' → 正确构建", () => {
    const stats = buildStructStats("心内科", "2026-Q3");
    expect(stats.dept).toBe("心内科");
    expect(stats.period).toBe("2026-Q3");
  });
});

describe("computeStructStats 高结构化", () => {
  // 手算：{totalRecords=500, structuredRecords=450}
  // 手算：structRate = Math.round(450/500*1000)/10 = Math.round(900)/10 = 90.0
  // 手算：gap = 500-450 = 50
  it("{totalRecords=500, structuredRecords=450} → structRate=90.0, gap=50", () => {
    const input: StructStatsInputV14 = { totalRecords: 500, structuredRecords: 450 };
    const result = computeStructStats(input);
    expect(result.structRate).toBeCloseTo(90.0, 1);
    expect(result.gap).toBe(50);
  });
});

describe("computeStructStats 低结构化", () => {
  // 手算：{totalRecords=300, structuredRecords=120}
  // 手算：structRate = Math.round(120/300*1000)/10 = Math.round(400)/10 = 40.0
  // 手算：gap = 300-120 = 180
  it("{totalRecords=300, structuredRecords=120} → structRate=40.0, gap=180", () => {
    const input: StructStatsInputV14 = { totalRecords: 300, structuredRecords: 120 };
    const result = computeStructStats(input);
    expect(result.structRate).toBeCloseTo(40.0, 1);
    expect(result.gap).toBe(180);
  });
});

describe("buildStructStatsReport 构建报告", () => {
  // 手算：{structRate:90.0, gap:50}
  // 手算：透传 structRate + gap
  it("{structRate:90.0, gap:50} → 正确返回（透传）", () => {
    const report = buildStructStatsReport({ structRate: 90.0, gap: 50 });
    expect(report.structRate).toBe(90.0);
    expect(report.gap).toBe(50);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-struct-stats auth:true", () => {
    const def = (emrStructStatsV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-struct-stats");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
