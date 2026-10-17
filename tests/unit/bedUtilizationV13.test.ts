/**
 * 健澜科技 jlmedaios - 床位利用 V13 单测（M396-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAverageLengthOfStayV13,
  computeBedTurnoverRateV13,
  computeBedUtilizationRateV13,
  type BedUtilizationRecordV13,
} from "../../src/bff/aggregators/bedUtilizationV13Aggregator";
import { bedUtilizationV13Routes } from "../../src/bff/routes/bedUtilizationV13";

const records: BedUtilizationRecordV13[] = [
  { occupiedBedDays: 900, openBedDays: 1000, dischargeCount: 100, avgOpenBeds: 50, patientBedDays: 900 },
  { occupiedBedDays: 900, openBedDays: 1000, dischargeCount: 100, avgOpenBeds: 50, patientBedDays: 900 },
];

describe("computeBedUtilizationRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("床位使用率 = 90.00%", () => {
    expect(computeBedUtilizationRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeBedUtilizationRateV13([])).toBe(0);
  });
});

describe("computeBedTurnoverRateV13", () => {
  // 算式：(100+100)/(50+50) = 200/100 = 2.00
  it("床位周转次数 = 2.00 次", () => {
    expect(computeBedTurnoverRateV13(records)).toBe(2.00);
  });
});

describe("computeAverageLengthOfStayV13", () => {
  // 算式：(900+900)/(100+100) = 1800/200 = 9.00
  it("平均住院日 = 9.00 天", () => {
    expect(computeAverageLengthOfStayV13(records)).toBe(9.00);
  });
});

describe("bedUtilizationV13Routes 读路由", () => {
  it("GET /api/v1/bed-utilization 路由存在且 auth:true", () => {
    const route = bedUtilizationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/bed-utilization",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
