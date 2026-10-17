/**
 * 健澜科技 jlmedaios - 抗菌药物管理 V13 单测（M357-D，M357 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAntibioticDddsV13,
  computeRestrictedClassRateV13,
  computeTherapeuticMicrobiologyTestRateV13,
  type AntibioticMgmtRecordV13,
} from "../../src/bff/aggregators/antibioticMgmtV13Aggregator";
import { antibioticMgmtV13Routes } from "../../src/bff/routes/antibioticMgmtV13";

const records: AntibioticMgmtRecordV13[] = [
  { ddds: 40.5, restrictedUseQuantity: 100, totalAntibioticQuantity: 400, therapeuticMicrobiologyTested: 90, therapeuticUseCount: 150 },
  { ddds: 39.5, restrictedUseQuantity: 100, totalAntibioticQuantity: 600, therapeuticMicrobiologyTested: 110, therapeuticUseCount: 150 },
];

describe("computeAntibioticDddsV13", () => {
  // 算式：40.5+39.5 = 80.00
  it("DDDs = 80.00", () => {
    expect(computeAntibioticDddsV13(records)).toBe(80.00);
  });
  it("空态 → 0", () => {
    expect(computeAntibioticDddsV13([])).toBe(0);
  });
});

describe("computeRestrictedClassRateV13", () => {
  // 算式：(100+100)/(400+600) = 200/1000×100 = 20.00
  it("限制级使用率 = 20.00%", () => {
    expect(computeRestrictedClassRateV13(records)).toBe(20.00);
  });
});

describe("computeTherapeuticMicrobiologyTestRateV13", () => {
  // 算式：(90+110)/(150+150) = 200/300×100 = 66.67
  it("治疗性使用微生物送检率 = 66.67%", () => {
    expect(computeTherapeuticMicrobiologyTestRateV13(records)).toBe(66.67);
  });
});

describe("antibioticMgmtV13Routes 读路由", () => {
  it("GET /api/v1/antibiotic-mgmt 路由存在且 auth:true", () => {
    const route = antibioticMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/antibiotic-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
