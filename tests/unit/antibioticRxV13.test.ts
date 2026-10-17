/**
 * 健澜科技 jlmedaios - 抗菌药物处方率 V13 单测（M336-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientUseRateV13,
  computeOutpatientRxRateV13,
  computeTypeIPreventiveRateV13,
  type AntibioticRxRecordV13,
} from "../../src/bff/aggregators/antibioticRxV13Aggregator";
import { antibioticRxV13Routes } from "../../src/bff/routes/antibioticRxV13";

const records: AntibioticRxRecordV13[] = [
  {
    outpatientTotalRx: 1000,
    outpatientAntibioticRx: 200,
    inpatientTotalPatients: 500,
    inpatientAntibioticPatients: 250,
    typeITotalIncisions: 100,
    typeIPreventiveUse: 30,
  },
];

describe("computeOutpatientRxRateV13", () => {
  // 算式：200/1000×100 = 20
  it("门诊处方率 = 20%", () => {
    expect(computeOutpatientRxRateV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientRxRateV13([])).toBe(0);
  });
});

describe("computeInpatientUseRateV13", () => {
  // 算式：250/500×100 = 50
  it("住院使用率 = 50%", () => {
    expect(computeInpatientUseRateV13(records)).toBe(50);
  });
});

describe("computeTypeIPreventiveRateV13", () => {
  // 算式：30/100×100 = 30
  it("Ⅰ类切口预防使用率 = 30%", () => {
    expect(computeTypeIPreventiveRateV13(records)).toBe(30);
  });
});

describe("antibioticRxV13Routes 读路由", () => {
  it("GET /api/v1/antibiotic-rx 路由存在且 auth:true", () => {
    const route = antibioticRxV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/antibiotic-rx",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
