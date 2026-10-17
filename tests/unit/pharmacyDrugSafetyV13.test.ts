/**
 * 健澜科技 jlmedaios - 药品安全 V13 单测（M406-D，M406 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugRecallResponseTimeV13,
  computeExpiredDrugDisposalRateV13,
  computeNarcoticPsychotropicDrugAccountMatchRateV13,
  type PharmacyDrugSafetyRecordV13,
} from "../../src/bff/aggregators/pharmacyDrugSafetyV13Aggregator";
import { pharmacyDrugSafetyV13Routes } from "../../src/bff/routes/pharmacyDrugSafetyV13";

const records: PharmacyDrugSafetyRecordV13[] = [
  { recallHours: 2.5, disposed: 95, expired: 100, matched: 980, totalStock: 1000 },
  { recallHours: 2.5, disposed: 95, expired: 100, matched: 980, totalStock: 1000 },
];

describe("computeDrugRecallResponseTimeV13", () => {
  // 算式：(2.5+2.5)/2 = 2.5 → Math.ceil(2.5) = 3
  it("药品召回响应时长 = 3 小时（Math.ceil 向上取整）", () => {
    expect(computeDrugRecallResponseTimeV13(records)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(computeDrugRecallResponseTimeV13([])).toBe(0);
  });
});

describe("computeExpiredDrugDisposalRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("过期药品处置率 = 95.00%", () => {
    expect(computeExpiredDrugDisposalRateV13(records)).toBe(95.00);
  });
});

describe("computeNarcoticPsychotropicDrugAccountMatchRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("麻精药品账物相符率 = 98.00%", () => {
    expect(computeNarcoticPsychotropicDrugAccountMatchRateV13(records)).toBe(98.00);
  });
});

describe("pharmacyDrugSafetyV13Routes 读路由", () => {
  it("GET /api/v1/pharmacy-drug-safety 路由存在且 auth:true", () => {
    const route = pharmacyDrugSafetyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacy-drug-safety",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
