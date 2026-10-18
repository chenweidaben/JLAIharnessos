/**
 * 健澜科技 jlmedaios - 商业贿赂治理质量管理 V13 单测（M438-C，行风廉洁与职业道德建设组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCommercialBriberyContractSignRateV13,
  computeCommercialBriberySupplierCommitmentRateV13,
  computeCommercialBriberyViolationInvestigationRateV13,
  type CommercialBriberyQualityMgmtRecordV13,
} from "../../src/bff/aggregators/commercialBriberyQualityMgmtV13Aggregator";
import { commercialBriberyQualityMgmtV13Routes } from "../../src/bff/routes/commercialBriberyQualityMgmtV13";

const records: CommercialBriberyQualityMgmtRecordV13[] = [
  { signedContracts: 950, totalContracts: 1000, investigatedCases: 950, totalViolationCases: 1000, committedSuppliers: 950, totalSuppliers: 1000 },
  { signedContracts: 950, totalContracts: 1000, investigatedCases: 950, totalViolationCases: 1000, committedSuppliers: 950, totalSuppliers: 1000 },
];

describe("computeCommercialBriberyContractSignRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("购销领域廉洁合同签署率 = 95.00%", () => {
    expect(computeCommercialBriberyContractSignRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeCommercialBriberyContractSignRateV13([])).toBe(0);
  });
});

describe("computeCommercialBriberyViolationInvestigationRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("违规案件查处率 = 95.00%", () => {
    expect(computeCommercialBriberyViolationInvestigationRateV13(records)).toBe(95.00);
  });
});

describe("computeCommercialBriberySupplierCommitmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("供应商廉洁承诺率 = 95.00%", () => {
    expect(computeCommercialBriberySupplierCommitmentRateV13(records)).toBe(95.00);
  });
});

describe("commercialBriberyQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/commercial-bribery-quality-mgmt 路由存在且 auth:true", () => {
    const route = commercialBriberyQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/commercial-bribery-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
