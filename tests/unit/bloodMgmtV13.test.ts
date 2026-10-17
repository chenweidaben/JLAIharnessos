/**
 * 健澜科技 jlmedaios - 输血管理 V13 单测（M360-D，M360 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAutologousTransfusionRateV13,
  computeBloodRequestRationalRateV13,
  computeBloodTransfusionReactionRateV13,
  type BloodMgmtRecordV13,
} from "../../src/bff/aggregators/bloodMgmtV13Aggregator";
import { bloodMgmtV13Routes } from "../../src/bff/routes/bloodMgmtV13";

const records: BloodMgmtRecordV13[] = [
  { reactionCount: 1, transfusionCount: 1000, autologousTransfusion: 100, transfusionTotal: 1000, requestRational: 950, requestCount: 1000 },
  { reactionCount: 1, transfusionCount: 1000, autologousTransfusion: 100, transfusionTotal: 1000, requestRational: 940, requestCount: 1000 },
];

describe("computeBloodTransfusionReactionRateV13", () => {
  // 算式：(1+1)/(1000+1000) = 2/2000×100 = 0.10
  it("输血不良反应发生率 = 0.10%", () => {
    expect(computeBloodTransfusionReactionRateV13(records)).toBe(0.10);
  });
  it("空态 → 0", () => {
    expect(computeBloodTransfusionReactionRateV13([])).toBe(0);
  });
});

describe("computeAutologousTransfusionRateV13", () => {
  // 算式：(100+100)/(1000+1000) = 200/2000×100 = 10.00
  it("自体输血率 = 10.00%", () => {
    expect(computeAutologousTransfusionRateV13(records)).toBe(10.00);
  });
});

describe("computeBloodRequestRationalRateV13", () => {
  // 算式：(950+940)/(1000+1000) = 1890/2000×100 = 94.50
  it("用血申请合理率 = 94.50%", () => {
    expect(computeBloodRequestRationalRateV13(records)).toBe(94.50);
  });
});

describe("bloodMgmtV13Routes 读路由", () => {
  it("GET /api/v1/blood-mgmt 路由存在且 auth:true", () => {
    const route = bloodMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
