/**
 * 健澜科技 jlmedaios - 抗菌药物使用强度 V13 单测（M333-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAntibioticComplianceRateV13,
  computeAntibioticDDDsPerBedDayV13,
  type AntibioticUseRecordV13,
} from "../../src/bff/aggregators/antibioticUseV13Aggregator";
import { antibioticUseV13Routes } from "../../src/bff/routes/antibioticUseV13";

const records: AntibioticUseRecordV13[] = [
  { ddds: 400, inpatientDays: 2000, totalUseCount: 50, compliantUseCount: 40 },
];

describe("computeAntibioticDDDsPerBedDayV13", () => {
  // 算式：400/2000 = 0.2
  it("DDDs/住院天 = 0.2", () => {
    expect(computeAntibioticDDDsPerBedDayV13(records)).toBe(0.2);
  });
  it("空态 → 0", () => {
    expect(computeAntibioticDDDsPerBedDayV13([])).toBe(0);
  });
});

describe("computeAntibioticComplianceRateV13", () => {
  // 算式：40/50×100 = 80
  it("合格率 = 80%", () => {
    expect(computeAntibioticComplianceRateV13(records)).toBe(80);
  });
});

describe("antibioticUseV13Routes 读路由", () => {
  it("GET /api/v1/antibiotic-use 路由存在且 auth:true", () => {
    const route = antibioticUseV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/antibiotic-use",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
