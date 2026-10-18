/**
 * 健澜科技 jlmedaios - 病历质控综合看板（避让版）V14 单测（M542-A）
 *
 * 测试 buildQcComprehensiveDashboard 构建质控看板、loadQcComprehensiveDashboard 看板加载、buildQcComprehensiveDashboardReport 构建看板报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQcComprehensiveDashboard,
  buildQcComprehensiveDashboardReport,
  loadQcComprehensiveDashboard,
  type QcComprehensiveDashboardInputV14,
} from "../../src/bff/aggregators/emrQcComprehensiveDashboardV14Aggregator";
import { emrQcComprehensiveDashboardV14Routes } from "../../src/bff/routes/emrQcComprehensiveDashboardV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQcComprehensiveDashboard 构建质控看板", () => {
  // 手算：dept='心内科', month='2026-10' → 正确构建
  it("dept='心内科', month='2026-10' → 正确构建", () => {
    const base = buildQcComprehensiveDashboard("心内科", "2026-10");
    expect(base.dept).toBe("心内科");
    expect(base.month).toBe("2026-10");
  });
});

describe("loadQcComprehensiveDashboard 正常", () => {
  // 手算：{totalRecords=500, qualifiedRecords=480, defectCount=25}
  // 手算：passRate = Math.round(480/500*1000)/10 = Math.round(0.96*1000)/10 = Math.round(960)/10 = 960/10 = 96.0
  // 手算：defectPerRecord = Math.round(25/500*100)/10 = Math.round(0.05*100)/10 = Math.round(5)/10 = 5/10 = 0.5
  it("{totalRecords=500, qualifiedRecords=480, defectCount=25} → passRate=96.0, defectPerRecord=0.5", () => {
    const input: QcComprehensiveDashboardInputV14 = { totalRecords: 500, qualifiedRecords: 480, defectCount: 25 };
    const result = loadQcComprehensiveDashboard(input);
    expect(result.passRate).toBeCloseTo(96.0);
    expect(result.defectPerRecord).toBeCloseTo(0.5);
  });
});

describe("loadQcComprehensiveDashboard 零分母", () => {
  // 手算：{totalRecords=0, qualifiedRecords=0, defectCount=0}
  // 手算：totalRecords=0 → 保护分支 → passRate=100.0
  // 手算：totalRecords=0 → 保护分支 → defectPerRecord=0
  it("{totalRecords=0, qualifiedRecords=0, defectCount=0} → passRate=100.0, defectPerRecord=0", () => {
    const input: QcComprehensiveDashboardInputV14 = { totalRecords: 0, qualifiedRecords: 0, defectCount: 0 };
    const result = loadQcComprehensiveDashboard(input);
    expect(result.passRate).toBe(100);
    expect(result.defectPerRecord).toBe(0);
  });
});

describe("buildQcComprehensiveDashboardReport 构建看板报告", () => {
  // 手算：{passRate=96.0, defectPerRecord=0.5}
  // 手算：透传 passRate + defectPerRecord
  it("{passRate=96.0, defectPerRecord=0.5} → 正确返回（透传）", () => {
    const report = buildQcComprehensiveDashboardReport({ passRate: 96.0, defectPerRecord: 0.5 });
    expect(report.passRate).toBeCloseTo(96.0);
    expect(report.defectPerRecord).toBeCloseTo(0.5);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-comprehensive-dashboard auth:true", () => {
    const def = (emrQcComprehensiveDashboardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-comprehensive-dashboard");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
