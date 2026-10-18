/**
 * 健澜科技 jlmedaios - 质控科室对比 V14 单测（M493-B）
 *
 * 测试 buildDeptCompare 构建、compareDeptMetrics 对比、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptCompare,
  compareDeptMetrics,
  type DeptCompareV14,
} from "../../src/bff/aggregators/emrQcDeptCompareV14Aggregator";
import { emrQcDeptCompareV14Routes } from "../../src/bff/routes/emrQcDeptCompareV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptCompare 内科vs外科", () => {
  // 手算：内科=92, 外科=85 → 正确构建
  it("内科=92, 外科=85 → 正确构建", () => {
    const compare: DeptCompareV14 = buildDeptCompare("内科", "外科", 92, 85);
    expect(compare.deptA).toBe("内科");
    expect(compare.deptB).toBe("外科");
    expect(compare.scoreA).toBe(92);
    expect(compare.scoreB).toBe(85);
  });
});

describe("compareDeptMetrics 内科领先", () => {
  // 手算：内科=92, 外科=85 → gap=7, better='内科'（92-85=7）
  it("内科=92, 外科=85 → gap=7, better='内科'", () => {
    const result = compareDeptMetrics("内科", 92, "外科", 85);
    expect(result.gap).toBe(7);
    expect(result.better).toBe("内科");
  });
});

describe("compareDeptMetrics 外科领先", () => {
  // 手算：内科=85, 外科=92 → gap=-7, better='外科'
  it("内科=85, 外科=92 → gap=-7, better='外科'", () => {
    const result = compareDeptMetrics("内科", 85, "外科", 92);
    expect(result.gap).toBe(-7);
    expect(result.better).toBe("外科");
  });
});

describe("compareDeptMetrics 持平", () => {
  // 手算：内科=90, 外科=90 → gap=0, better='持平'
  it("内科=90, 外科=90 → gap=0, better='持平'", () => {
    const result = compareDeptMetrics("内科", 90, "外科", 90);
    expect(result.gap).toBe(0);
    expect(result.better).toBe("持平");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-compare auth:true", () => {
    const def = (emrQcDeptCompareV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-compare");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
