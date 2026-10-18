/**
 * 健澜科技 jlmedaios - 质控数据导出区域上报 V14 单测（M497-D，M497 收官）
 *
 * 测试 buildRegionReport 构建、validateRegionFormat 校验、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRegionReport,
  validateRegionFormat,
  type RegionReportV14,
} from "../../src/bff/aggregators/emrQcExportRegionV14Aggregator";
import { emrQcExportRegionV14Routes } from "../../src/bff/routes/emrQcExportRegionV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRegionReport 杭州2026Q3", () => {
  // 手算：region='杭州', period='2026Q3', metrics={defectRate:2, passRate:98} → 正确构建
  it("region='杭州', period='2026Q3', metrics={defectRate:2, passRate:98} → 正确构建", () => {
    const report: RegionReportV14 = buildRegionReport("杭州", "2026Q3", { defectRate: 2, passRate: 98 });
    expect(report.region).toBe("杭州");
    expect(report.period).toBe("2026Q3");
    expect(report.metrics).toEqual({ defectRate: 2, passRate: 98 });
  });
});

describe("validateRegionFormat 完整报告", () => {
  // 手算：完整报告 → valid=true, errors=[]
  it("完整报告 → valid=true, errors=[]", () => {
    const report = buildRegionReport("杭州", "2026Q3", { defectRate: 2, passRate: 98 });
    const result = validateRegionFormat(report);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("validateRegionFormat 缺失region", () => {
  // 手算：缺失 region → valid=false, errors 包含'region 必填'
  it("缺失 region → valid=false, errors 包含'region 必填'", () => {
    const report = buildRegionReport("", "2026Q3", { defectRate: 2 });
    const result = validateRegionFormat(report);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("region 必填");
  });
});

describe("validateRegionFormat metrics为空", () => {
  // 手算：metrics 为空 → valid=false, errors 包含'metrics 不能为空'
  it("metrics 为空 → valid=false, errors 包含'metrics 不能为空'", () => {
    const report = buildRegionReport("杭州", "2026Q3", {});
    const result = validateRegionFormat(report);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("metrics 不能为空");
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-export-region auth:true", () => {
    const def = (emrQcExportRegionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-export-region");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
