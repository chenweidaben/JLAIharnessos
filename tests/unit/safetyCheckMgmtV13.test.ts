/**
 * 健澜科技 jlmedaios - 安全核查管理 V13 单测（M426-C，换名避让旧版 surgeryVolumeV13（M339））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSurgeryPauseExecutionRateV13,
  computeSurgerySafetyCheckRateV13,
  computeSurgerySiteMarkRateV13,
  type SafetyCheckMgmtRecordV13,
} from "../../src/bff/aggregators/safetyCheckMgmtV13Aggregator";
import { safetyCheckMgmtV13Routes } from "../../src/bff/routes/safetyCheckMgmtV13";

const records: SafetyCheckMgmtRecordV13[] = [
  { safetyCheckDone: 980, siteMarked: 950, pauseExecuted: 990, surgeryTotal: 1000 },
  { safetyCheckDone: 980, siteMarked: 950, pauseExecuted: 990, surgeryTotal: 1000 },
];

describe("computeSurgerySafetyCheckRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("手术安全核查率 = 98.00%", () => {
    expect(computeSurgerySafetyCheckRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeSurgerySafetyCheckRateV13([])).toBe(0);
  });
});

describe("computeSurgerySiteMarkRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("手术部位标识率 = 95.00%", () => {
    expect(computeSurgerySiteMarkRateV13(records)).toBe(95.00);
  });
});

describe("computeSurgeryPauseExecutionRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("手术暂停执行率 = 99.00%", () => {
    expect(computeSurgeryPauseExecutionRateV13(records)).toBe(99.00);
  });
});

describe("safetyCheckMgmtV13Routes 读路由", () => {
  it("GET /api/v1/safety-check-mgmt 路由存在且 auth:true", () => {
    const route = safetyCheckMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/safety-check-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
