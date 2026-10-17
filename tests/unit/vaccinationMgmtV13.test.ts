/**
 * 健澜科技 jlmedaios - 疫苗接种 V13 单测（M393-D，M393 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFluVaccinationRateV13,
  computeHBsAbPositiveRateV13,
  computeHealthcareWorkerVaccinationRateV13,
  type VaccinationMgmtRecordV13,
} from "../../src/bff/aggregators/vaccinationMgmtV13Aggregator";
import { vaccinationMgmtV13Routes } from "../../src/bff/routes/vaccinationMgmtV13";

const records: VaccinationMgmtRecordV13[] = [
  { vaccinatedCount: 950, shouldCount: 1000, fluVaccinatedCount: 900, fluShouldCount: 1000, positiveCount: 980, testedCount: 1000 },
  { vaccinatedCount: 950, shouldCount: 1000, fluVaccinatedCount: 900, fluShouldCount: 1000, positiveCount: 980, testedCount: 1000 },
];

describe("computeHealthcareWorkerVaccinationRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("医护人员疫苗接种率 = 95.00%", () => {
    expect(computeHealthcareWorkerVaccinationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHealthcareWorkerVaccinationRateV13([])).toBe(0);
  });
});

describe("computeFluVaccinationRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("流感疫苗接种率 = 90.00%", () => {
    expect(computeFluVaccinationRateV13(records)).toBe(90.00);
  });
});

describe("computeHBsAbPositiveRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("乙肝表面抗体阳性率 = 98.00%", () => {
    expect(computeHBsAbPositiveRateV13(records)).toBe(98.00);
  });
});

describe("vaccinationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/vaccination-mgmt 路由存在且 auth:true", () => {
    const route = vaccinationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/vaccination-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
