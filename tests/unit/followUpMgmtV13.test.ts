/**
 * 健澜科技 jlmedaios - 随访管理 V13 单测（M400-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeChronicDiseaseFollowupRateV13,
  computeDischargeFollowupRateV13,
  computeHighRiskPatientFollowupRateV13,
  type FollowUpMgmtRecordV13,
} from "../../src/bff/aggregators/followUpMgmtV13Aggregator";
import { followUpMgmtV13Routes } from "../../src/bff/routes/followUpMgmtV13";

const records: FollowUpMgmtRecordV13[] = [
  { dischargeFollowed: 800, dischargeTotal: 1000, chronicFollowed: 750, chronicTotal: 1000, highRiskFollowed: 950, highRiskTotal: 1000 },
  { dischargeFollowed: 800, dischargeTotal: 1000, chronicFollowed: 750, chronicTotal: 1000, highRiskFollowed: 950, highRiskTotal: 1000 },
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

describe("computeChronicDiseaseFollowupRateV13", () => {
  // 算式：(750+750)/(1000+1000) = 1500/2000×100 = 75.00
  it("慢性病随访率 = 75.00%", () => {
    expect(computeChronicDiseaseFollowupRateV13(records)).toBe(75.00);
  });
});

describe("computeHighRiskPatientFollowupRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("高危患者随访率 = 95.00%", () => {
    expect(computeHighRiskPatientFollowupRateV13(records)).toBe(95.00);
  });
});

describe("followUpMgmtV13Routes 读路由", () => {
  it("GET /api/v1/follow-up-mgmt 路由存在且 auth:true", () => {
    const route = followUpMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/follow-up-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
