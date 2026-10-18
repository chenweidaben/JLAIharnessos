/**
 * 健澜科技 jlmedaios - 病历质控患者满意度 V14 单测（M475-C）
 *
 * 测试 computeSatisfactionScore 平均分计算、buildSatisfactionStats 分组统计、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSatisfactionStats,
  computeSatisfactionScore,
  type SatisfactionResponseV14,
} from "../../src/bff/aggregators/emrPatientSatisfactionV14Aggregator";
import { emrPatientSatisfactionV14Routes } from "../../src/bff/routes/emrPatientSatisfactionV14";
import type { RouteDef } from "../../src/bff/types";

describe("computeSatisfactionScore 平均分", () => {
  // 手算：3 次评分 90/80/100 → (90+80+100)/3 = 270/3 = 90.0
  it("3 次评分 90/80/100 → avg=90.0", () => {
    const responses = [{ score: 90 }, { score: 80 }, { score: 100 }];
    expect(computeSatisfactionScore(responses)).toBeCloseTo(90.0);
  });
});

describe("computeSatisfactionScore 空数组", () => {
  // 手算：空数组 → avg=0
  it("空数组 → avg=0", () => {
    expect(computeSatisfactionScore([])).toBe(0);
  });
});

describe("buildSatisfactionStats 总答卷数", () => {
  // 手算：5 次评分 → totalResponses=5
  it("5 次评分 → totalResponses=5", () => {
    const responses: SatisfactionResponseV14[] = [
      { score: 90, dept: "内科" },
      { score: 80, dept: "内科" },
      { score: 100, dept: "外科" },
      { score: 85, dept: "外科" },
      { score: 95, dept: "外科" },
    ];
    const stats = buildSatisfactionStats(responses);
    expect(stats.totalResponses).toBe(5);
  });
});

describe("buildSatisfactionStats 按科室分组", () => {
  // 手算：内科 2 次 + 外科 3 次 → byDept 含 2 个科室
  it("内科 2 次外科 3 次 → byDept 含 2 个科室", () => {
    const responses: SatisfactionResponseV14[] = [
      { score: 90, dept: "内科" },
      { score: 80, dept: "内科" },
      { score: 100, dept: "外科" },
      { score: 85, dept: "外科" },
      { score: 95, dept: "外科" },
    ];
    const stats = buildSatisfactionStats(responses);
    expect(stats.byDept.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-patient-satisfaction auth:true", () => {
    const def = (emrPatientSatisfactionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-patient-satisfaction");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
