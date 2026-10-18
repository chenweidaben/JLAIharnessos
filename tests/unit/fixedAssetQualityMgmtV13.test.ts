/**
 * 健澜科技 jlmedaios - 固定资产质量管理 V13 单测（M435-C，-quality 后缀避让旧版固定资产模块（M408 medicalDeviceMgmtV13 等））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFixedAssetCompletenessRateV13,
  computeFixedAssetInventoryAccuracyRateV13,
  computeFixedAssetUtilizationRateV13,
  type FixedAssetQualityMgmtRecordV13,
} from "../../src/bff/aggregators/fixedAssetQualityMgmtV13Aggregator";
import { fixedAssetQualityMgmtV13Routes } from "../../src/bff/routes/fixedAssetQualityMgmtV13";

const records: FixedAssetQualityMgmtRecordV13[] = [
  { actualUsageHours: 900, shouldUsageHours: 1000, intactAssets: 980, totalAssets: 1000, matchedAssets: 950, totalInventoryAssets: 1000 },
  { actualUsageHours: 900, shouldUsageHours: 1000, intactAssets: 980, totalAssets: 1000, matchedAssets: 950, totalInventoryAssets: 1000 },
];

describe("computeFixedAssetUtilizationRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("资产利用率 = 90.00%", () => {
    expect(computeFixedAssetUtilizationRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeFixedAssetUtilizationRateV13([])).toBe(0);
  });
});

describe("computeFixedAssetCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("资产完好率 = 98.00%", () => {
    expect(computeFixedAssetCompletenessRateV13(records)).toBe(98.00);
  });
});

describe("computeFixedAssetInventoryAccuracyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("资产盘点准确率 = 95.00%", () => {
    expect(computeFixedAssetInventoryAccuracyRateV13(records)).toBe(95.00);
  });
});

describe("fixedAssetQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/fixed-asset-quality-mgmt 路由存在且 auth:true", () => {
    const route = fixedAssetQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/fixed-asset-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
