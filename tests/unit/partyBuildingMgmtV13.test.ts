/**
 * 健澜科技 jlmedaios - 党建管理 V13 单测（M450-B，宣传与党建管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePartyBuildingActivityRateV13,
  computePartyBuildingStudyCoverageRateV13,
  computePartyBuildingTaskCompletionRateV13,
  type PartyBuildingMgmtRecordV13,
} from "../../src/bff/aggregators/partyBuildingMgmtV13Aggregator";
import { partyBuildingMgmtV13Routes } from "../../src/bff/routes/partyBuildingMgmtV13";

const records: PartyBuildingMgmtRecordV13[] = [
  { conducted: 950, planned: 1000, studied: 900, totalMembers: 1000, completed: 980, totalTask: 1000 },
  { conducted: 950, planned: 1000, studied: 900, totalMembers: 1000, completed: 980, totalTask: 1000 },
];

describe("computePartyBuildingActivityRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("党组织活动开展率 = 95.00%", () => {
    expect(computePartyBuildingActivityRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePartyBuildingActivityRateV13([])).toBe(0);
  });
});

describe("computePartyBuildingStudyCoverageRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("党员学习覆盖率 = 90.00%", () => {
    expect(computePartyBuildingStudyCoverageRateV13(records)).toBe(90.00);
  });
});

describe("computePartyBuildingTaskCompletionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("党建任务完成率 = 98.00%", () => {
    expect(computePartyBuildingTaskCompletionRateV13(records)).toBe(98.00);
  });
});

describe("partyBuildingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/party-building-mgmt 路由存在且 auth:true", () => {
    const route = partyBuildingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/party-building-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
