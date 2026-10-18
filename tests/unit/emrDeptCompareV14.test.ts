/**
 * 健澜科技 jlmedaios - 病历科室质控对比分析 V14 单测（M469-B）
 *
 * 测试 compareDeptScores 平均分偏差+排名、buildComparisonTable 表头、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildComparisonTable,
  compareDeptScores,
  type DeptScoreInputV14,
} from "../../src/bff/aggregators/emrDeptCompareV14Aggregator";
import { emrDeptCompareV14Routes } from "../../src/bff/routes/emrDeptCompareV14";
import type { RouteDef } from "../../src/bff/types";

const depts: DeptScoreInputV14[] = [
  { name: "内科", score: 90 },
  { name: "外科", score: 80 },
];

describe("compareDeptScores 平均分偏差", () => {
  // 手算：内科 90 / 外科 80 → avg = (90+80)/2 = 85；内科 diffFromAvg = 90-85 = +5；外科 = 80-85 = -5
  it("内科 90 / 外科 80 → avg=85，内科 diffFromAvg=5，外科=-5", () => {
    const results = compareDeptScores(depts);
    const internal = results.find((r) => r.name === "内科");
    const surgery = results.find((r) => r.name === "外科");
    expect(internal?.diffFromAvg).toBe(5);
    expect(surgery?.diffFromAvg).toBe(-5);
  });
});

describe("compareDeptScores 降序排名", () => {
  // 手算：内科 90 > 外科 80 → 内科 rank=1，外科 rank=2
  it("按 score 降序排名，内科 rank=1", () => {
    const results = compareDeptScores(depts);
    expect(results[0]?.name).toBe("内科");
    expect(results[0]?.rank).toBe(1);
  });
});

describe("compareDeptScores 空数组", () => {
  // 手算：空数组 → 返回空数组 []
  it("空数组 → 返回空数组", () => {
    expect(compareDeptScores([])).toEqual([]);
  });
});

describe("buildComparisonTable 表头", () => {
  // 手算：headers 应包含"科室名"/"得分"/"排名"
  it("headers 含'科室名'/'得分'/'排名'", () => {
    const table = buildComparisonTable(depts);
    expect(table.headers).toContain("科室名");
    expect(table.headers).toContain("得分");
    expect(table.headers).toContain("排名");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-dept-compare auth:true", () => {
    const def = (emrDeptCompareV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-dept-compare");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
