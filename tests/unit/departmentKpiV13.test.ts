/**
 * 健澜科技 jlmedaios - 科室KPI V13 单测（M410-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDepartmentKpiCompletionRateV13,
  computeDepartmentPerformanceScoreV13,
  computeDepartmentRankingV13,
  type DepartmentKpiRecordV13,
} from "../../src/bff/aggregators/departmentKpiV13Aggregator";
import { departmentKpiV13Routes } from "../../src/bff/routes/departmentKpiV13";

const records: DepartmentKpiRecordV13[] = [
  { completed: 95, total: 100, score: 85.5, ranking: 3 },
  { completed: 95, total: 100, score: 85.5, ranking: 5 },
];

describe("computeDepartmentKpiCompletionRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("科室KPI完成率 = 95.00%", () => {
    expect(computeDepartmentKpiCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDepartmentKpiCompletionRateV13([])).toBe(0);
  });
});

describe("computeDepartmentPerformanceScoreV13", () => {
  // 算式：(85.5+85.5)/2 = 85.50
  it("科室绩效得分 = 85.50", () => {
    expect(computeDepartmentPerformanceScoreV13(records)).toBe(85.50);
  });
});

describe("computeDepartmentRankingV13", () => {
  // 算式：Math.min(3, 5) = 3
  it("科室排名 = 3 名（取最佳排名 Math.min）", () => {
    expect(computeDepartmentRankingV13(records)).toBe(3);
  });
});

describe("departmentKpiV13Routes 读路由", () => {
  it("GET /api/v1/department-kpi 路由存在且 auth:true", () => {
    const route = departmentKpiV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/department-kpi",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
