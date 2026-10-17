/**
 * 健澜科技 jlmedaios - 抗菌药物使用管理 V13 单测（M421-B，换名避让旧版 antiInfectionDetailV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAntibioticEtiologyTestRateV13,
  computeAntibioticUsageDDDsV13,
  computeSpecialGradeAntibioticConsultRateV13,
  type AntibioticUsageMgmtRecordV13,
} from "../../src/bff/aggregators/antibioticUsageMgmtV13Aggregator";
import { antibioticUsageMgmtV13Routes } from "../../src/bff/routes/antibioticUsageMgmtV13";

const records: AntibioticUsageMgmtRecordV13[] = [
  { dddsSum: 40.5, etiologyTest: 950, antibioticUse: 1000, specialConsult: 980, specialUse: 1000 },
  { dddsSum: 42.3, etiologyTest: 950, antibioticUse: 1000, specialConsult: 980, specialUse: 1000 },
];

describe("computeAntibioticUsageDDDsV13", () => {
  // 算式：40.5+42.3 = 82.8（数值求和，保留 2 位小数，不是百分比）
  it("抗菌药物使用强度 DDDs = 82.80", () => {
    expect(computeAntibioticUsageDDDsV13(records)).toBe(82.80);
  });
  it("空态 → 0", () => {
    expect(computeAntibioticUsageDDDsV13([])).toBe(0);
  });
});

describe("computeAntibioticEtiologyTestRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("抗菌药物病原学送检率 = 95.00%", () => {
    expect(computeAntibioticEtiologyTestRateV13(records)).toBe(95.00);
  });
});

describe("computeSpecialGradeAntibioticConsultRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("特殊使用级抗菌药物会诊率 = 98.00%", () => {
    expect(computeSpecialGradeAntibioticConsultRateV13(records)).toBe(98.00);
  });
});

describe("antibioticUsageMgmtV13Routes 读路由", () => {
  it("GET /api/v1/antibiotic-usage-mgmt 路由存在且 auth:true", () => {
    const route = antibioticUsageMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/antibiotic-usage-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
