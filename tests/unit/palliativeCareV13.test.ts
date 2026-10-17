/**
 * 健澜科技 jlmedaios - 安宁疗护 V13 单测（M350-D，M350 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFamilySatisfactionV13,
  computeHospiceBedDaysV13,
  computePainAssessmentRateV13,
  type PalliativeCareRecordV13,
} from "../../src/bff/aggregators/palliativeCareV13Aggregator";
import { palliativeCareV13Routes } from "../../src/bff/routes/palliativeCareV13";

const records: PalliativeCareRecordV13[] = [
  { hospiceBedDays: 400, painAssessedCount: 80, palliativePatientsCount: 100, familySatisfaction: 4.5 },
  { hospiceBedDays: 300, painAssessedCount: 80, palliativePatientsCount: 100, familySatisfaction: 4.7 },
  { hospiceBedDays: 300, painAssessedCount: 80, palliativePatientsCount: 100, familySatisfaction: 4.8 },
];

describe("computeHospiceBedDaysV13", () => {
  // 算式：400+300+300 = 1000
  it("安宁疗护床日数 = 1000", () => {
    expect(computeHospiceBedDaysV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeHospiceBedDaysV13([])).toBe(0);
  });
});

describe("computePainAssessmentRateV13", () => {
  // 算式：(80+80+80)/(100+100+100) = 240/300×100 = 80.00
  it("疼痛评估率 = 80.00%", () => {
    expect(computePainAssessmentRateV13(records)).toBe(80.00);
  });
});

describe("computeFamilySatisfactionV13", () => {
  // 算式：(4.5+4.7+4.8)/3 = 14.0/3 = 4.666... → 4.67
  it("家属满意度 = 4.67", () => {
    expect(computeFamilySatisfactionV13(records)).toBe(4.67);
  });
});

describe("palliativeCareV13Routes 读路由", () => {
  it("GET /api/v1/palliative-care 路由存在且 auth:true", () => {
    const route = palliativeCareV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/palliative-care",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
