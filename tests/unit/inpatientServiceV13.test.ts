/**
 * 健澜科技 jlmedaios - 住院服务 V13 单测（M373-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAverageLodgingDaysV13,
  computeDischargeCountV13,
  computeInpatientCountV13,
  type InpatientServiceRecordV13,
} from "../../src/bff/aggregators/inpatientServiceV13Aggregator";
import { inpatientServiceV13Routes } from "../../src/bff/routes/inpatientServiceV13";

const records: InpatientServiceRecordV13[] = [
  { inpatientCount: 500, dischargeCount: 480, averageLodgingDays: 7 },
  { inpatientCount: 500, dischargeCount: 480, averageLodgingDays: 7 },
];

describe("computeInpatientCountV13", () => {
  // 算式：500+500 = 1000
  it("住院人次 = 1000", () => {
    expect(computeInpatientCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeInpatientCountV13([])).toBe(0);
  });
});

describe("computeDischargeCountV13", () => {
  // 算式：480+480 = 960
  it("出院人次 = 960", () => {
    expect(computeDischargeCountV13(records)).toBe(960);
  });
});

describe("computeAverageLodgingDaysV13", () => {
  // 算式：(7+7)/2 = 7.00
  it("平均住院日 = 7.00 天", () => {
    expect(computeAverageLodgingDaysV13(records)).toBe(7.00);
  });
});

describe("inpatientServiceV13Routes 读路由", () => {
  it("GET /api/v1/inpatient-service 路由存在且 auth:true", () => {
    const route = inpatientServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/inpatient-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
