/**
 * 健澜科技 jlmedaios - 数据治理明细 V13 单测（M401-B，避让旧版 dataGovernanceV13/dataGovernanceStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataQualityScoreV13,
  computeDataStandardAdoptionRateV13,
  computeMasterDataConsistencyRateV13,
  type DataGovernanceDetailRecordV13,
} from "../../src/bff/aggregators/dataGovernanceDetailV13Aggregator";
import { dataGovernanceDetailV13Routes } from "../../src/bff/routes/dataGovernanceDetailV13";

const records: DataGovernanceDetailRecordV13[] = [
  { qualityScore: 90, consistent: 950, totalChecked: 1000, adopted: 800, totalStandards: 1000 },
  { qualityScore: 90, consistent: 950, totalChecked: 1000, adopted: 800, totalStandards: 1000 },
];

describe("computeDataQualityScoreV13", () => {
  // 算式：(90+90)/2 = 90.00
  it("数据质量评分 = 90.00 分", () => {
    expect(computeDataQualityScoreV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeDataQualityScoreV13([])).toBe(0);
  });
});

describe("computeMasterDataConsistencyRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("主数据一致性率 = 95.00%", () => {
    expect(computeMasterDataConsistencyRateV13(records)).toBe(95.00);
  });
});

describe("computeDataStandardAdoptionRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("数据标准落地率 = 80.00%", () => {
    expect(computeDataStandardAdoptionRateV13(records)).toBe(80.00);
  });
});

describe("dataGovernanceDetailV13Routes 读路由", () => {
  it("GET /api/v1/data-governance-detail 路由存在且 auth:true", () => {
    const route = dataGovernanceDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-governance-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
