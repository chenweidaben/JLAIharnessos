/**
 * 健澜科技 jlmedaios - 绩效考核 V13 单测（M402-D，M402 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDepartmentExcellentRateV13,
  computePerformanceAppealHandleRateV13,
  computePersonalExcellentRateV13,
  type PerformanceEvalDetailRecordV13,
} from "../../src/bff/aggregators/performanceEvalDetailV13Aggregator";
import { performanceEvalDetailV13Routes } from "../../src/bff/routes/performanceEvalDetailV13";

const records: PerformanceEvalDetailRecordV13[] = [
  { deptExcellent: 20, deptTotal: 100, personExcellent: 150, personTotal: 1000, handledAppeal: 95, totalAppeal: 100 },
  { deptExcellent: 20, deptTotal: 100, personExcellent: 150, personTotal: 1000, handledAppeal: 95, totalAppeal: 100 },
];

describe("computeDepartmentExcellentRateV13", () => {
  // 算式：(20+20)/(100+100) = 40/200×100 = 20.00
  it("科室考核优秀率 = 20.00%", () => {
    expect(computeDepartmentExcellentRateV13(records)).toBe(20.00);
  });
  it("空态 → 0", () => {
    expect(computeDepartmentExcellentRateV13([])).toBe(0);
  });
});

describe("computePersonalExcellentRateV13", () => {
  // 算式：(150+150)/(1000+1000) = 300/2000×100 = 15.00
  it("个人考核优秀率 = 15.00%", () => {
    expect(computePersonalExcellentRateV13(records)).toBe(15.00);
  });
});

describe("computePerformanceAppealHandleRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("绩效申诉处理率 = 95.00%", () => {
    expect(computePerformanceAppealHandleRateV13(records)).toBe(95.00);
  });
});

describe("performanceEvalDetailV13Routes 读路由", () => {
  it("GET /api/v1/performance-eval-detail 路由存在且 auth:true", () => {
    const route = performanceEvalDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/performance-eval-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
