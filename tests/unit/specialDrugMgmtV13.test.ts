/**
 * 健澜科技 jlmedaios - 特殊药品管理 V13 单测（M455-D，M455 收官，药品供应与库存管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSpecialDrugAccountMatchRateV13,
  computeSpecialDrugHandoverRecordCompletenessRateV13,
  computeSpecialDrugPrescriptionQualifiedRateV13,
  type SpecialDrugMgmtRecordV13,
} from "../../src/bff/aggregators/specialDrugMgmtV13Aggregator";
import { specialDrugMgmtV13Routes } from "../../src/bff/routes/specialDrugMgmtV13";

const records: SpecialDrugMgmtRecordV13[] = [
  { matched: 950, totalItem: 1000, qualified: 900, totalPrescription: 1000, complete: 980, totalRecord: 1000 },
  { matched: 950, totalItem: 1000, qualified: 900, totalPrescription: 1000, complete: 980, totalRecord: 1000 },
];

describe("computeSpecialDrugAccountMatchRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("麻精药品账物相符率 = 95.00%", () => {
    expect(computeSpecialDrugAccountMatchRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeSpecialDrugAccountMatchRateV13([])).toBe(0);
  });
});

describe("computeSpecialDrugPrescriptionQualifiedRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("特殊药品处方合格率 = 90.00%", () => {
    expect(computeSpecialDrugPrescriptionQualifiedRateV13(records)).toBe(90.00);
  });
});

describe("computeSpecialDrugHandoverRecordCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("特殊药品交接班记录完整率 = 98.00%", () => {
    expect(computeSpecialDrugHandoverRecordCompletenessRateV13(records)).toBe(98.00);
  });
});

describe("specialDrugMgmtV13Routes 读路由", () => {
  it("GET /api/v1/special-drug-mgmt 路由存在且 auth:true", () => {
    const route = specialDrugMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/special-drug-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
