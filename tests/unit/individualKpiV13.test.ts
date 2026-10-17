/**
 * 健澜科技 jlmedaios - 个人KPI V13 单测（M410-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIndividualExcellentRateV13,
  computeIndividualKpiCompletionRateV13,
  computeIndividualPerformanceScoreV13,
  type IndividualKpiRecordV13,
} from "../../src/bff/aggregators/individualKpiV13Aggregator";
import { individualKpiV13Routes } from "../../src/bff/routes/individualKpiV13";

const records: IndividualKpiRecordV13[] = [
  { completed: 98, total: 100, score: 88.5, excellent: 20, assessed: 100 },
  { completed: 98, total: 100, score: 88.5, excellent: 20, assessed: 100 },
];

describe("computeIndividualKpiCompletionRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("个人KPI完成率 = 98.00%", () => {
    expect(computeIndividualKpiCompletionRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeIndividualKpiCompletionRateV13([])).toBe(0);
  });
});

describe("computeIndividualPerformanceScoreV13", () => {
  // 算式：(88.5+88.5)/2 = 88.50
  it("个人绩效得分 = 88.50", () => {
    expect(computeIndividualPerformanceScoreV13(records)).toBe(88.50);
  });
});

describe("computeIndividualExcellentRateV13", () => {
  // 算式：(20+20)/(100+100)×100 = 40/200×100 = 20.00
  it("个人评优率 = 20.00%", () => {
    expect(computeIndividualExcellentRateV13(records)).toBe(20.00);
  });
});

describe("individualKpiV13Routes 读路由", () => {
  it("GET /api/v1/individual-kpi 路由存在且 auth:true", () => {
    const route = individualKpiV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/individual-kpi",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
