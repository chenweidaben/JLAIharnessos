/**
 * 健澜科技 jlmedaios - 护理感控 V13 单测（M389-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAsepticOperationQualificationRateV13,
  computeCatheterRelatedInfectionRateV13,
  computeHandHygieneComplianceRateV13,
  type NursingInfectionControlRecordV13,
} from "../../src/bff/aggregators/nursingInfectionControlV13Aggregator";
import { nursingInfectionControlV13Routes } from "../../src/bff/routes/nursingInfectionControlV13";

const records: NursingInfectionControlRecordV13[] = [
  { compliantCount: 950, shouldExecuteCount: 1000, qualifiedCount: 900, inspectCount: 1000, infectionCount: 5, catheterDays: 1000 },
  { compliantCount: 950, shouldExecuteCount: 1000, qualifiedCount: 900, inspectCount: 1000, infectionCount: 5, catheterDays: 1000 },
];

describe("computeHandHygieneComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("手卫生依从率 = 95.00%", () => {
    expect(computeHandHygieneComplianceRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHandHygieneComplianceRateV13([])).toBe(0);
  });
});

describe("computeAsepticOperationQualificationRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("无菌操作合格率 = 90.00%", () => {
    expect(computeAsepticOperationQualificationRateV13(records)).toBe(90.00);
  });
});

describe("computeCatheterRelatedInfectionRateV13", () => {
  // 算式：(5+5)/(1000+1000)×1000 = 10/2000×1000 = 5.00‰
  it("导管相关感染率 = 5.00‰", () => {
    expect(computeCatheterRelatedInfectionRateV13(records)).toBe(5.00);
  });
});

describe("nursingInfectionControlV13Routes 读路由", () => {
  it("GET /api/v1/nursing-infection-control 路由存在且 auth:true", () => {
    const route = nursingInfectionControlV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-infection-control",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
