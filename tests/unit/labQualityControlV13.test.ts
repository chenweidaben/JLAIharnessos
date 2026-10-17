/**
 * 健澜科技 jlmedaios - 检验质控 V13 单测（M392-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCriticalValueReportTimelyRateV13,
  computeEQAQQualificationRateV13,
  computeIQCQualificationRateV13,
  type LabQualityControlRecordV13,
} from "../../src/bff/aggregators/labQualityControlV13Aggregator";
import { labQualityControlV13Routes } from "../../src/bff/routes/labQualityControlV13";

const records: LabQualityControlRecordV13[] = [
  { iqcQualifiedCount: 950, iqcTotalCount: 1000, eqaQualifiedCount: 900, eqaTotalCount: 1000, timelyCount: 980, criticalTotalCount: 1000 },
  { iqcQualifiedCount: 950, iqcTotalCount: 1000, eqaQualifiedCount: 900, eqaTotalCount: 1000, timelyCount: 980, criticalTotalCount: 1000 },
];

describe("computeIQCQualificationRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("室内质控合格率 = 95.00%", () => {
    expect(computeIQCQualificationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeIQCQualificationRateV13([])).toBe(0);
  });
});

describe("computeEQAQQualificationRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("室间质评合格率 = 90.00%", () => {
    expect(computeEQAQQualificationRateV13(records)).toBe(90.00);
  });
});

describe("computeCriticalValueReportTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("危急值报告及时率 = 98.00%", () => {
    expect(computeCriticalValueReportTimelyRateV13(records)).toBe(98.00);
  });
});

describe("labQualityControlV13Routes 读路由", () => {
  it("GET /api/v1/lab-quality-control 路由存在且 auth:true", () => {
    const route = labQualityControlV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/lab-quality-control",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
