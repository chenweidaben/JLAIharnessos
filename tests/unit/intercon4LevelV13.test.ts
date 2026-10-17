/**
 * 健澜科技 jlmedaios - 互联互通四甲自评 V13 单测（M323-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBusinessCollabScoreV13,
  computeInfoSharingScoreV13,
  computeInterconOverallV13,
  computePlatformStandardScoreV13,
  type InterconAssessmentV13,
} from "../../src/bff/aggregators/intercon4LevelV13Aggregator";
import { intercon4LevelV13Routes } from "../../src/bff/routes/intercon4LevelV13";

const assessments: InterconAssessmentV13[] = [
  { dimension: "platformStandard", score: 80 },
  { dimension: "platformStandard", score: 85 },
  { dimension: "platformStandard", score: 90 },
  { dimension: "infoSharing", score: 85 },
  { dimension: "infoSharing", score: 90 },
  { dimension: "infoSharing", score: 95 },
  { dimension: "businessCollab", score: 82 },
  { dimension: "businessCollab", score: 88 },
  { dimension: "businessCollab", score: 94 },
];

describe("computePlatformStandardScoreV13", () => {
  // 算式：(80+85+90)/3 = 255/3 = 85
  it("platformStandard = 85", () => {
    expect(computePlatformStandardScoreV13(assessments)).toBe(85);
  });
  it("空态 → 0", () => {
    expect(computePlatformStandardScoreV13([])).toBe(0);
  });
});

describe("computeInfoSharingScoreV13", () => {
  // 算式：(85+90+95)/3 = 270/3 = 90
  it("infoSharing = 90", () => {
    expect(computeInfoSharingScoreV13(assessments)).toBe(90);
  });
});

describe("computeBusinessCollabScoreV13", () => {
  // 算式：(82+88+94)/3 = 264/3 = 88
  it("businessCollab = 88", () => {
    expect(computeBusinessCollabScoreV13(assessments)).toBe(88);
  });
});

describe("computeInterconOverallV13", () => {
  // 算式：(85+90+88)/3 = 263/3 = 87.67 → round = 88
  it("overall = 88", () => {
    expect(computeInterconOverallV13(85, 90, 88)).toBe(88);
  });
  // 算式：≥90 四甲
  it("90 → 达标", () => {
    expect(computeInterconOverallV13(90, 90, 90) >= 90).toBe(true);
  });
});

describe("intercon4LevelV13Routes 读路由", () => {
  it("GET /api/v1/intercon4-level 路由存在且 auth:true", () => {
    const route = intercon4LevelV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/intercon4-level",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
