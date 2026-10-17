/**
 * 健澜科技 jlmedaios - 手卫生督查 V13 单测（M423-A，换名避让旧版 handHygieneComplianceV13（M418））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHandHygieneAuditCoverageRateV13,
  computeHandHygieneSuppliesConsumptionRateV13,
  computeHandHygieneTrainingCoverageRateV13,
  type HandHygieneAuditRecordV13,
} from "../../src/bff/aggregators/handHygieneAuditV13Aggregator";
import { handHygieneAuditV13Routes } from "../../src/bff/routes/handHygieneAuditV13";

const records: HandHygieneAuditRecordV13[] = [
  { auditedDept: 95, shouldAuditDept: 100, suppliesCompliantDept: 90, deptTotal: 100, trainedPersons: 950, shouldTrainPersons: 1000 },
  { auditedDept: 95, shouldAuditDept: 100, suppliesCompliantDept: 90, deptTotal: 100, trainedPersons: 950, shouldTrainPersons: 1000 },
];

describe("computeHandHygieneAuditCoverageRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("手卫生督查覆盖率 = 95.00%", () => {
    expect(computeHandHygieneAuditCoverageRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHandHygieneAuditCoverageRateV13([])).toBe(0);
  });
});

describe("computeHandHygieneSuppliesConsumptionRateV13", () => {
  // 算式：(90+90)/(100+100)×100 = 180/200×100 = 90.00
  it("手卫生用品消耗达标率 = 90.00%", () => {
    expect(computeHandHygieneSuppliesConsumptionRateV13(records)).toBe(90.00);
  });
});

describe("computeHandHygieneTrainingCoverageRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("手卫生培训覆盖率 = 95.00%", () => {
    expect(computeHandHygieneTrainingCoverageRateV13(records)).toBe(95.00);
  });
});

describe("handHygieneAuditV13Routes 读路由", () => {
  it("GET /api/v1/hand-hygiene-audit 路由存在且 auth:true", () => {
    const route = handHygieneAuditV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hand-hygiene-audit",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
