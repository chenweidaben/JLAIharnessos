/**
 * 健澜科技 jlmedaios - 多科室横向对标 V13 单测（M310-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCompositeScoreV13,
  identifyBenchmarkDeptV13,
  identifyLaggingDeptV13,
  rankDeptsByBenchmarkV13,
  type DeptBenchmarkV13,
} from "../../src/bff/aggregators/deptBenchmarkV13Aggregator";
import { deptBenchmarkV13Routes } from "../../src/bff/routes/deptBenchmarkV13";

const depts: DeptBenchmarkV13[] = [
  { deptId: "cardio", deptName: "心内科", closureRate: 80, sopCount: 3, adoptionRate: 70 },
  { deptId: "surgery", deptName: "外科", closureRate: 60, sopCount: 2, adoptionRate: 50 },
  { deptId: "pediatrics", deptName: "儿科", closureRate: 40, sopCount: 1, adoptionRate: 30 },
];

describe("computeCompositeScoreV13", () => {
  // 算式：cardio = 80×0.4 + 3×20 + 70×0.4 = 32 + 60 + 28 = 120
  it("cardio = 120", () => {
    expect(computeCompositeScoreV13(depts[0])).toBe(120);
  });
});

describe("rankDeptsByBenchmarkV13", () => {
  // 算式：cardio=120 > surgery=60×0.4+2×20+50×0.4=24+40+20=84 > peds=40×0.4+1×20+30×0.4=16+20+12=48
  it("降序：cardio → surgery → pediatrics", () => {
    const r = rankDeptsByBenchmarkV13(depts);
    expect(r[0].deptId).toBe("cardio");
    expect(r[1].deptId).toBe("surgery");
    expect(r[2].deptId).toBe("pediatrics");
  });
  it("空态 → []", () => {
    expect(rankDeptsByBenchmarkV13([]).length).toBe(0);
  });
});

describe("identifyBenchmarkDeptV13", () => {
  it("Top1 = cardio", () => {
    const r = rankDeptsByBenchmarkV13(depts);
    expect(identifyBenchmarkDeptV13(r)?.deptId).toBe("cardio");
  });
  it("空态 → null", () => {
    expect(identifyBenchmarkDeptV13([])).toBeNull();
  });
});

describe("identifyLaggingDeptV13", () => {
  it("Bottom1 = pediatrics", () => {
    const r = rankDeptsByBenchmarkV13(depts);
    expect(identifyLaggingDeptV13(r)?.deptId).toBe("pediatrics");
  });
});

describe("deptBenchmarkV13Routes 读路由", () => {
  it("GET /api/v1/dept-benchmark 路由存在且 auth:true", () => {
    const route = deptBenchmarkV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dept-benchmark",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
