/**
 * 健澜科技 jlmedaios - 经验资产运营与退役 V13 单测（M305-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  identifyStaleExperienceV13,
  retireExperienceV13,
  scoreAssetValueV13,
  type AssetExperienceV13,
} from "../../src/bff/aggregators/experienceAssetV13Aggregator";
import { experienceAssetV13Routes } from "../../src/bff/routes/experienceAssetV13";

const e1: AssetExperienceV13 = {
  experienceId: "e-1",
  title: "房颤华法林",
  recentUseCount: 5,
  evidenceStrength: 0.8,
  freshnessScore: 90,
  daysSinceLastUse: 30,
  status: "active",
};

const e2: AssetExperienceV13 = {
  experienceId: "e-2",
  title: "旧版阿司匹林",
  recentUseCount: 0,
  evidenceStrength: 0.3,
  freshnessScore: 20,
  daysSinceLastUse: 200,
  status: "active",
};

describe("scoreAssetValueV13", () => {
  // 算式：5×10×0.4 + 0.8×100×0.3 + 90×0.3 = 20 + 24 + 27 = 71.0
  it("e-1 score = 71.0", () => {
    expect(scoreAssetValueV13(e1)).toBe(71.0);
  });
  // 算式：0×10×0.4 + 0.3×100×0.3 + 20×0.3 = 0 + 9 + 6 = 15.0
  it("e-2 score = 15.0", () => {
    expect(scoreAssetValueV13(e2)).toBe(15.0);
  });
});

describe("identifyStaleExperienceV13", () => {
  // 算式：e-1 days=30 不>180 → false
  it("e-1 不陈旧", () => {
    expect(identifyStaleExperienceV13(e1)).toBe(false);
  });
  // 算式：e-2 days=200>180 且 evidence=0.3<0.5 → true
  it("e-2 陈旧", () => {
    expect(identifyStaleExperienceV13(e2)).toBe(true);
  });
});

describe("retireExperienceV13", () => {
  it("e-2 → status=retired", () => {
    const retired = retireExperienceV13(e2);
    expect(retired.status).toBe("retired");
    expect(retired.experienceId).toBe("e-2");
  });
});

describe("experienceAssetV13Routes 读路由", () => {
  it("GET /api/v1/experience-asset 路由存在且 auth:true", () => {
    const route = experienceAssetV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/experience-asset",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
