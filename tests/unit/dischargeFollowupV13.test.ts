/**
 * 健澜科技 jlmedaios - 出院随访 V13 单测（M373-D，M373 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDischargeFollowupRateV13,
  computeFollowupCompletionRateV13,
  computeFollowupPatientSatisfactionRateV13,
  type DischargeFollowupRecordV13,
} from "../../src/bff/aggregators/dischargeFollowupV13Aggregator";
import { dischargeFollowupV13Routes } from "../../src/bff/routes/dischargeFollowupV13";

const records: DischargeFollowupRecordV13[] = [
  { dischargeCount: 1000, followupCount: 800, shouldFollowupCount: 1000, completedFollowupCount: 950, satisfactionCount: 760 },
  { dischargeCount: 1000, followupCount: 800, shouldFollowupCount: 1000, completedFollowupCount: 950, satisfactionCount: 760 },
];

describe("computeDischargeFollowupRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("出院随访率 = 80.00%", () => {
    expect(computeDischargeFollowupRateV13(records)).toBe(80.00);
  });
  it("空态 → 0", () => {
    expect(computeDischargeFollowupRateV13([])).toBe(0);
  });
});

describe("computeFollowupCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("随访完成率 = 95.00%", () => {
    expect(computeFollowupCompletionRateV13(records)).toBe(95.00);
  });
});

describe("computeFollowupPatientSatisfactionRateV13", () => {
  // 算式：(760+760)/(800+800) = 1520/1600×100 = 95.00
  it("随访患者满意度 = 95.00%", () => {
    expect(computeFollowupPatientSatisfactionRateV13(records)).toBe(95.00);
  });
});

describe("dischargeFollowupV13Routes 读路由", () => {
  it("GET /api/v1/discharge-followup 路由存在且 auth:true", () => {
    const route = dischargeFollowupV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/discharge-followup",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
