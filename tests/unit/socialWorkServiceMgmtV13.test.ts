/**
 * 健澜科技 jlmedaios - 社工服务管理 V13 单测（M457-D，M457 收官，医院文化与公益管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSocialWorkServiceCaseCountV13,
  computeSocialWorkServiceDifficultyPatientAssistRateV13,
  computeSocialWorkServiceGroupActivityCountV13,
  type SocialWorkServiceMgmtRecordV13,
} from "../../src/bff/aggregators/socialWorkServiceMgmtV13Aggregator";
import { socialWorkServiceMgmtV13Routes } from "../../src/bff/routes/socialWorkServiceMgmtV13";

const records: SocialWorkServiceMgmtRecordV13[] = [
  { caseCount: 950, groupActivityCount: 900, assisted: 980, totalDifficulty: 1000 },
  { caseCount: 950, groupActivityCount: 900, assisted: 980, totalDifficulty: 1000 },
];

describe("computeSocialWorkServiceCaseCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("社工个案数量 = 1900 件（reduce 累加）", () => {
    expect(computeSocialWorkServiceCaseCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeSocialWorkServiceCaseCountV13([])).toBe(0);
  });
});

describe("computeSocialWorkServiceGroupActivityCountV13", () => {
  // 算式：900 + 900 = 1800（reduce 累加）
  it("社工小组活动次数 = 1800 次（reduce 累加）", () => {
    expect(computeSocialWorkServiceGroupActivityCountV13(records)).toBe(1800);
  });
});

describe("computeSocialWorkServiceDifficultyPatientAssistRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("困难患者救助率 = 98.00%", () => {
    expect(computeSocialWorkServiceDifficultyPatientAssistRateV13(records)).toBe(98.00);
  });
});

describe("socialWorkServiceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/social-work-service-mgmt 路由存在且 auth:true", () => {
    const route = socialWorkServiceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/social-work-service-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
