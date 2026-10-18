/**
 * 健澜科技 jlmedaios - 质控科室考核评分 V14 单测（M501-D，M501 收官）
 *
 * 测试 buildDeptAssess 构建、aggregateDeptAssess 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateDeptAssess,
  buildDeptAssess,
  type DeptAssessScoreV14,
} from "../../src/bff/aggregators/emrQcDeptAssessScoreV14Aggregator";
import { emrQcDeptAssessScoreV14Routes } from "../../src/bff/routes/emrQcDeptAssessScoreV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptAssess 内科第一", () => {
  // 手算：dept='内科', score=92, rank=1 → 正确构建
  it("dept='内科', score=92, rank=1 → 正确构建", () => {
    const assess: DeptAssessScoreV14 = buildDeptAssess("内科", 92, 1);
    expect(assess.dept).toBe("内科");
    expect(assess.score).toBe(92);
    expect(assess.rank).toBe(1);
  });
});

describe("aggregateDeptAssess 三科室", () => {
  // 手算：3 科室（内科92/外科85/儿科88）→ avgScore=88.3（(92+85+88)/3=265/3≈88.3）, topDept='内科'（92 最高）
  it("3 科室 → avgScore=88.3, topDept='内科'", () => {
    const assesses: DeptAssessScoreV14[] = [
      buildDeptAssess("内科", 92, 1),
      buildDeptAssess("外科", 85, 3),
      buildDeptAssess("儿科", 88, 2),
    ];
    const result = aggregateDeptAssess(assesses);
    expect(result.avgScore).toBeCloseTo(88.3);
    expect(result.topDept).toBe("内科");
  });
});

describe("aggregateDeptAssess 空数组", () => {
  // 手算：空数组 → avgScore=0, topDept=''
  it("空数组 → avgScore=0, topDept=''", () => {
    const assesses: DeptAssessScoreV14[] = [];
    const result = aggregateDeptAssess(assesses);
    expect(result.avgScore).toBe(0);
    expect(result.topDept).toBe("");
  });
});

describe("buildDeptAssess 外科第二", () => {
  // 手算：dept='外科', score=85, rank=2 → 正确构建
  it("dept='外科', score=85, rank=2 → 正确构建", () => {
    const assess: DeptAssessScoreV14 = buildDeptAssess("外科", 85, 2);
    expect(assess.dept).toBe("外科");
    expect(assess.rank).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-assess-score auth:true", () => {
    const def = (emrQcDeptAssessScoreV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-assess-score");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
