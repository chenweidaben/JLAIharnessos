/**
 * 健澜科技 jlmedaios - 药品效期管理 V13 单测（M455-C，药品供应与库存管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugExpiryInspectionCoverageRateV13,
  computeDrugExpiryNearExpiryWarningRateV13,
  computeDrugExpiryOverdueWriteOffRateV13,
  type DrugExpiryMgmtRecordV13,
} from "../../src/bff/aggregators/drugExpiryMgmtV13Aggregator";
import { drugExpiryMgmtV13Routes } from "../../src/bff/routes/drugExpiryMgmtV13";

const records: DrugExpiryMgmtRecordV13[] = [
  { warned: 950, totalNearExpiry: 1000, overdue: 30, totalDrug: 1000, inspected: 900, totalInspect: 1000 },
  { warned: 950, totalNearExpiry: 1000, overdue: 30, totalDrug: 1000, inspected: 900, totalInspect: 1000 },
];

describe("computeDrugExpiryNearExpiryWarningRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("近效期药品预警率 = 95.00%", () => {
    expect(computeDrugExpiryNearExpiryWarningRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDrugExpiryNearExpiryWarningRateV13([])).toBe(0);
  });
});

describe("computeDrugExpiryOverdueWriteOffRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00（反向指标）
  it("过期药品报损率 = 3.00%（越低越好）", () => {
    expect(computeDrugExpiryOverdueWriteOffRateV13(records)).toBe(3.00);
  });
});

describe("computeDrugExpiryInspectionCoverageRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("效期巡检覆盖率 = 90.00%", () => {
    expect(computeDrugExpiryInspectionCoverageRateV13(records)).toBe(90.00);
  });
});

describe("drugExpiryMgmtV13Routes 读路由", () => {
  it("GET /api/v1/drug-expiry-mgmt 路由存在且 auth:true", () => {
    const route = drugExpiryMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-expiry-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
