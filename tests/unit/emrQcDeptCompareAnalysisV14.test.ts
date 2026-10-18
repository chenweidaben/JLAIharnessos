/**
 * 健澜科技 jlmedaios - 质控科室对比分析 V14 单测（M501-A）
 *
 * 测试 buildDeptCompare 构建、aggregateDeptCompare 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateDeptCompare,
  buildDeptCompare,
  type DeptCompareAnalysisV14,
} from "../../src/bff/aggregators/emrQcDeptCompareAnalysisV14Aggregator";
import { emrQcDeptCompareAnalysisV14Routes } from "../../src/bff/routes/emrQcDeptCompareAnalysisV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptCompare 内科vs外科", () => {
  // 手算：deptA='内科', scoreA=92, deptB='外科', scoreB=85 → 正确构建
  it("deptA='内科', scoreA=92, deptB='外科', scoreB=85 → 正确构建", () => {
    const compare: DeptCompareAnalysisV14 = buildDeptCompare("内科", 92, "外科", 85);
    expect(compare.deptA).toBe("内科");
    expect(compare.scoreA).toBe(92);
    expect(compare.deptB).toBe("外科");
    expect(compare.scoreB).toBe(85);
  });
});

describe("aggregateDeptCompare 内科胜", () => {
  // 手算：[{内科,92},{外科,85}] → better='内科'（92>85）, gap=7（92-85=7）
  it("内科vs外科 → better='内科', gap=7", () => {
    const pairs = [
      { deptA: "内科", scoreA: 92, deptB: "外科", scoreB: 85 },
    ];
    const result = aggregateDeptCompare(pairs);
    expect(result.better).toBe("内科");
    expect(result.gap).toBe(7);
  });
});

describe("aggregateDeptCompare 急诊胜", () => {
  // 手算：[{儿科,88},{急诊,95}] → better='急诊'（95>88）, gap=7（95-88=7）
  it("儿科vs急诊 → better='急诊', gap=7", () => {
    const pairs = [
      { deptA: "儿科", scoreA: 88, deptB: "急诊", scoreB: 95 },
    ];
    const result = aggregateDeptCompare(pairs);
    expect(result.better).toBe("急诊");
    expect(result.gap).toBe(7);
  });
});

describe("buildDeptCompare 儿科vs急诊", () => {
  // 手算：deptA='儿科', scoreA=88, deptB='急诊', scoreB=95 → 正确构建
  it("deptA='儿科', scoreA=88, deptB='急诊', scoreB=95 → 正确构建", () => {
    const compare: DeptCompareAnalysisV14 = buildDeptCompare("儿科", 88, "急诊", 95);
    expect(compare.deptA).toBe("儿科");
    expect(compare.scoreB).toBe(95);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-compare-analysis auth:true", () => {
    const def = (emrQcDeptCompareAnalysisV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-compare-analysis");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
