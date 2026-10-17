/**
 * 健澜科技 jlmedaios - 值班管理 V13 单测（M402-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDutyPresenceRateV13,
  computeNightDutyCoverageRateV13,
  computeShiftSwapApprovalRateV13,
  type DutyRosterRecordV13,
} from "../../src/bff/aggregators/dutyRosterV13Aggregator";
import { dutyRosterV13Routes } from "../../src/bff/routes/dutyRosterV13";

const records: DutyRosterRecordV13[] = [
  { present: 980, total: 1000, approvedSwap: 950, totalSwap: 1000, nightActual: 90, nightTotal: 100 },
  { present: 980, total: 1000, approvedSwap: 950, totalSwap: 1000, nightActual: 90, nightTotal: 100 },
];

describe("computeDutyPresenceRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("值班到岗率 = 98.00%", () => {
    expect(computeDutyPresenceRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeDutyPresenceRateV13([])).toBe(0);
  });
});

describe("computeShiftSwapApprovalRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("值班换班审批率 = 95.00%", () => {
    expect(computeShiftSwapApprovalRateV13(records)).toBe(95.00);
  });
});

describe("computeNightDutyCoverageRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("夜间值班覆盖率 = 90.00%", () => {
    expect(computeNightDutyCoverageRateV13(records)).toBe(90.00);
  });
});

describe("dutyRosterV13Routes 读路由", () => {
  it("GET /api/v1/duty-roster 路由存在且 auth:true", () => {
    const route = dutyRosterV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/duty-roster",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
