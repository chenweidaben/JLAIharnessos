/**
 * 健澜科技 jlmedaios - 污水处理质量管理 V13 单测（M436-A，院感安全环保质量管理深化组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSewageTreatmentOperationRateV13,
  computeSewageTreatmentQualifiedRateV13,
  computeSewageTreatmentStandardRateV13,
  type SewageTreatmentQualityMgmtRecordV13,
} from "../../src/bff/aggregators/sewageTreatmentQualityMgmtV13Aggregator";
import { sewageTreatmentQualityMgmtV13Routes } from "../../src/bff/routes/sewageTreatmentQualityMgmtV13";

const records: SewageTreatmentQualityMgmtRecordV13[] = [
  { standardCount: 980, totalCount: 1000, qualifiedVolume: 950, totalVolume: 1000, actualHours: 900, shouldHours: 1000 },
  { standardCount: 980, totalCount: 1000, qualifiedVolume: 950, totalVolume: 1000, actualHours: 900, shouldHours: 1000 },
];

describe("computeSewageTreatmentStandardRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("污水处理达标率 = 98.00%", () => {
    expect(computeSewageTreatmentStandardRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeSewageTreatmentStandardRateV13([])).toBe(0);
  });
});

describe("computeSewageTreatmentQualifiedRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("污水处理合格率 = 95.00%", () => {
    expect(computeSewageTreatmentQualifiedRateV13(records)).toBe(95.00);
  });
});

describe("computeSewageTreatmentOperationRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("污水处理运行率 = 90.00%", () => {
    expect(computeSewageTreatmentOperationRateV13(records)).toBe(90.00);
  });
});

describe("sewageTreatmentQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/sewage-treatment-quality-mgmt 路由存在且 auth:true", () => {
    const route = sewageTreatmentQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/sewage-treatment-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
