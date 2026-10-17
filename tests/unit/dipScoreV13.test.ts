/**
 * 健澜科技 jlmedaios - DIP 病种分值 V13 单测（M356-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDipCoverageRateV13,
  computeDiseaseStructureIndexV13,
  computeInsuranceSurplusAmountV13,
  type DipScoreRecordV13,
} from "../../src/bff/aggregators/dipScoreV13Aggregator";
import { dipScoreV13Routes } from "../../src/bff/routes/dipScoreV13";

const records: DipScoreRecordV13[] = [
  { dipEnrolledDiseases: 80, totalDiseases: 100, diseaseStructureIndex: 1.05, insuranceSurplusAmount: 50.50 },
  { dipEnrolledDiseases: 70, totalDiseases: 100, diseaseStructureIndex: 0.95, insuranceSurplusAmount: 49.50 },
];

describe("computeDipCoverageRateV13", () => {
  // 算式：(80+70)/(100+100) = 150/200×100 = 75.00
  it("DIP 覆盖率 = 75.00%", () => {
    expect(computeDipCoverageRateV13(records)).toBe(75.00);
  });
  it("空态 → 0", () => {
    expect(computeDipCoverageRateV13([])).toBe(0);
  });
});

describe("computeDiseaseStructureIndexV13", () => {
  // 算式：(1.05+0.95)/2 = 2.00/2 = 1.000
  it("病种结构指数 = 1.000", () => {
    expect(computeDiseaseStructureIndexV13(records)).toBe(1.000);
  });
});

describe("computeInsuranceSurplusAmountV13", () => {
  // 算式：50.50+49.50 = 100.00
  it("医保结余留用金额 = 100.00 万元", () => {
    expect(computeInsuranceSurplusAmountV13(records)).toBe(100.00);
  });
});

describe("dipScoreV13Routes 读路由", () => {
  it("GET /api/v1/dip-score 路由存在且 auth:true", () => {
    const route = dipScoreV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dip-score",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
