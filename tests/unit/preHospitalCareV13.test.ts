/**
 * 健澜科技 jlmedaios - 院前急救 V13 单测（M348-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compute120DispatchCountV13,
  computeAvgArrivalMinutesV13,
  computeRescueEffectiveRateV13,
  type PreHospitalCareRecordV13,
} from "../../src/bff/aggregators/preHospitalCareV13Aggregator";
import { preHospitalCareV13Routes } from "../../src/bff/routes/preHospitalCareV13";

const records: PreHospitalCareRecordV13[] = [
  { dispatchCount: 50, arrivalMinutes: 10, effectiveCount: 45 },
  { dispatchCount: 50, arrivalMinutes: 14, effectiveCount: 45 },
];

describe("compute120DispatchCountV13", () => {
  // 算式：50+50 = 100
  it("120 出车次数 = 100", () => {
    expect(compute120DispatchCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(compute120DispatchCountV13([])).toBe(0);
  });
});

describe("computeAvgArrivalMinutesV13", () => {
  // 算式：(10+14)/2 = 12.0
  it("平均到达时间 = 12.0 分钟", () => {
    expect(computeAvgArrivalMinutesV13(records)).toBe(12.0);
  });
});

describe("computeRescueEffectiveRateV13", () => {
  // 算式：(45+45)/(50+50) = 90/100×100 = 90.00
  it("抢救有效率 = 90.00%", () => {
    expect(computeRescueEffectiveRateV13(records)).toBe(90.00);
  });
});

describe("preHospitalCareV13Routes 读路由", () => {
  it("GET /api/v1/pre-hospital-care 路由存在且 auth:true", () => {
    const route = preHospitalCareV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pre-hospital-care",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
