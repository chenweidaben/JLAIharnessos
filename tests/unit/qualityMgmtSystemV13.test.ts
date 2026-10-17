/**
 * 健澜科技 jlmedaios - 质量管理体系 V13 单测（M395-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeQualityCommitteeMeetingCountV13,
  computeQualityImprovementProjectCountV13,
  computeQualityObjectiveAchievementRateV13,
  type QualityMgmtSystemRecordV13,
} from "../../src/bff/aggregators/qualityMgmtSystemV13Aggregator";
import { qualityMgmtSystemV13Routes } from "../../src/bff/routes/qualityMgmtSystemV13";

const records: QualityMgmtSystemRecordV13[] = [
  { meetingCount: 12, achievedCount: 90, totalCount: 100, projectCount: 15 },
  { meetingCount: 12, achievedCount: 90, totalCount: 100, projectCount: 15 },
];

describe("computeQualityCommitteeMeetingCountV13", () => {
  // 算式：12+12 = 24
  it("质量委员会会议次数 = 24 次", () => {
    expect(computeQualityCommitteeMeetingCountV13(records)).toBe(24);
  });
  it("空态 → 0", () => {
    expect(computeQualityCommitteeMeetingCountV13([])).toBe(0);
  });
});

describe("computeQualityObjectiveAchievementRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("质量目标达成率 = 90.00%", () => {
    expect(computeQualityObjectiveAchievementRateV13(records)).toBe(90.00);
  });
});

describe("computeQualityImprovementProjectCountV13", () => {
  // 算式：15+15 = 30
  it("质量改进项目数 = 30 个", () => {
    expect(computeQualityImprovementProjectCountV13(records)).toBe(30);
  });
});

describe("qualityMgmtSystemV13Routes 读路由", () => {
  it("GET /api/v1/quality-mgmt-system 路由存在且 auth:true", () => {
    const route = qualityMgmtSystemV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/quality-mgmt-system",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
