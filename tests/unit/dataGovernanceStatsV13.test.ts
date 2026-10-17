/**
 * 健澜科技 jlmedaios - 数据治理 V13（统计）单测（M363-D，stats避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataQualityPassRateV13,
  computeDataStandardCoverageRateV13,
  computeMetadataManagementRateV13,
  type DataGovernanceStatsRecordV13,
} from "../../src/bff/aggregators/dataGovernanceStatsV13Aggregator";
import { dataGovernanceStatsV13Routes } from "../../src/bff/routes/dataGovernanceStatsV13";

const records: DataGovernanceStatsRecordV13[] = [
  { qualityPassed: 950, qualityChecked: 1000, standardCovered: 480, standardTotal: 500, metadataManaged: 95, metadataRequired: 100 },
  { qualityPassed: 950, qualityChecked: 1000, standardCovered: 470, standardTotal: 500, metadataManaged: 95, metadataRequired: 100 },
];

describe("computeDataQualityPassRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("数据质量合格率 = 95.00%", () => {
    expect(computeDataQualityPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDataQualityPassRateV13([])).toBe(0);
  });
});

describe("computeDataStandardCoverageRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("数据标准覆盖率 = 95.00%", () => {
    expect(computeDataStandardCoverageRateV13(records)).toBe(95.00);
  });
});

describe("computeMetadataManagementRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("元数据管理率 = 95.00%", () => {
    expect(computeMetadataManagementRateV13(records)).toBe(95.00);
  });
});

describe("dataGovernanceStatsV13Routes 读路由", () => {
  it("GET /api/v1/data-governance-stats 路由存在且 auth:true", () => {
    const route = dataGovernanceStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-governance-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
