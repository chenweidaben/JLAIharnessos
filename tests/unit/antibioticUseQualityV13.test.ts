/**
 * 健澜科技 jlmedaios - 抗菌药物使用质量管理 V13 单测（M440-B，药事管理与药学服务组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAntibioticUseDddsV13,
  computeAntibioticUseInpatientRateV13,
  computeAntibioticUseOutpatientRateV13,
  type AntibioticUseQualityRecordV13,
} from "../../src/bff/aggregators/antibioticUseQualityV13Aggregator";
import { antibioticUseQualityV13Routes } from "../../src/bff/routes/antibioticUseQualityV13";

const records: AntibioticUseQualityRecordV13[] = [
  { dddsTotal: 400, totalBedDays: 100, outpatientAntibioticPrescription: 200, outpatientTotalPrescription: 1000, inpatientAntibioticPatient: 300, inpatientTotalPatient: 1000 },
  { dddsTotal: 400, totalBedDays: 100, outpatientAntibioticPrescription: 200, outpatientTotalPrescription: 1000, inpatientAntibioticPatient: 300, inpatientTotalPatient: 1000 },
];

describe("computeAntibioticUseDddsV13", () => {
  // 算式：(400+400)/(100+100)×100 = 800/200×100 = 400.00 DDDs/100人天
  it("抗菌药物使用强度 = 400.00 DDDs/100人天", () => {
    expect(computeAntibioticUseDddsV13(records)).toBe(400.00);
  });
  it("空态 → 0", () => {
    expect(computeAntibioticUseDddsV13([])).toBe(0);
  });
});

describe("computeAntibioticUseOutpatientRateV13", () => {
  // 算式：(200+200)/(1000+1000)×100 = 400/2000×100 = 20.00%（反向，越低越好）
  it("门诊抗菌药物使用率 = 20.00%（反向，越低越好）", () => {
    expect(computeAntibioticUseOutpatientRateV13(records)).toBe(20.00);
  });
});

describe("computeAntibioticUseInpatientRateV13", () => {
  // 算式：(300+300)/(1000+1000)×100 = 600/2000×100 = 30.00%（反向，越低越好）
  it("住院抗菌药物使用率 = 30.00%（反向，越低越好）", () => {
    expect(computeAntibioticUseInpatientRateV13(records)).toBe(30.00);
  });
});

describe("antibioticUseQualityV13Routes 读路由", () => {
  it("GET /api/v1/antibiotic-use-quality 路由存在且 auth:true", () => {
    const route = antibioticUseQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/antibiotic-use-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
