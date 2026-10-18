/**
 * 健澜科技 jlmedaios - 计划生育技术服务 V13 单测（M442-D，M442 收官，妇幼健康与计划生育管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFamilyPlanningComplicationRateV13,
  computeFamilyPlanningCounselingRateV13,
  computeFamilyPlanningFollowUpRateV13,
  type FamilyPlanningMgmtRecordV13,
} from "../../src/bff/aggregators/familyPlanningMgmtV13Aggregator";
import { familyPlanningMgmtV13Routes } from "../../src/bff/routes/familyPlanningMgmtV13";

const records: FamilyPlanningMgmtRecordV13[] = [
  { counseled: 950, shouldCounsel: 1000, complicationCount: 5, totalSurgery: 1000, followedUp: 980, shouldFollowUp: 1000 },
  { counseled: 950, shouldCounsel: 1000, complicationCount: 5, totalSurgery: 1000, followedUp: 980, shouldFollowUp: 1000 },
];

describe("computeFamilyPlanningCounselingRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("避孕节育咨询率 = 95.00%", () => {
    expect(computeFamilyPlanningCounselingRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeFamilyPlanningCounselingRateV13([])).toBe(0);
  });
});

describe("computeFamilyPlanningComplicationRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50%（反向，越低越好）
  it("手术并发症发生率 = 0.50%（反向，越低越好）", () => {
    expect(computeFamilyPlanningComplicationRateV13(records)).toBe(0.50);
  });
});

describe("computeFamilyPlanningFollowUpRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("随访率 = 98.00%", () => {
    expect(computeFamilyPlanningFollowUpRateV13(records)).toBe(98.00);
  });
});

describe("familyPlanningMgmtV13Routes 读路由", () => {
  it("GET /api/v1/family-planning-mgmt 路由存在且 auth:true", () => {
    const route = familyPlanningMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/family-planning-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
