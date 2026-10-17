/**
 * 健澜科技 jlmedaios - 护士满意度调研 V13 单测（M332-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNurseSatisfactionV13,
  type NurseSatisfactionSurveyV13,
} from "../../src/bff/aggregators/nurseSatisfactionV13Aggregator";
import { nurseSatisfactionV13Routes } from "../../src/bff/routes/nurseSatisfactionV13";

const surveys: NurseSatisfactionSurveyV13[] = [
  { salary: 3, scheduling: 4, workEnvironment: 3 },
  { salary: 4, scheduling: 3, workEnvironment: 4 },
  { salary: 5, scheduling: 4, workEnvironment: 4 },
];

describe("computeNurseSatisfactionV13", () => {
  // 算式：薪酬 (3+4+5)/3=4.0 / 排班 (4+3+4)/3≈3.7
  it("薪酬 = 4.0", () => {
    const dims = computeNurseSatisfactionV13(surveys);
    expect(dims.length).toBe(3);
    expect(dims[0].dimension).toBe("薪酬");
    expect(dims[0].score).toBe(4.0);
  });
  it("排班 ≈ 3.7", () => {
    const dims = computeNurseSatisfactionV13(surveys);
    expect(dims[1].dimension).toBe("排班");
    expect(dims[1].score).toBe(3.7);
  });
  it("空态 → []", () => {
    expect(computeNurseSatisfactionV13([]).length).toBe(0);
  });
});

describe("nurseSatisfactionV13Routes 读路由", () => {
  it("GET /api/v1/nurse-satisfaction 路由存在且 auth:true", () => {
    const route = nurseSatisfactionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nurse-satisfaction",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
