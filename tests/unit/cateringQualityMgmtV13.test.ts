/**
 * 健澜科技 jlmedaios - 膳食质量管理 V13 单测（M437-A，后勤保障与环境管理深化组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCateringCostControlRateV13,
  computeCateringPatientSatisfactionRateV13,
  computeCateringQualifiedRateV13,
  type CateringQualityMgmtRecordV13,
} from "../../src/bff/aggregators/cateringQualityMgmtV13Aggregator";
import { cateringQualityMgmtV13Routes } from "../../src/bff/routes/cateringQualityMgmtV13";

const records: CateringQualityMgmtRecordV13[] = [
  { qualifiedMeals: 980, totalMeals: 1000, satisfiedPatients: 920, surveyedPatients: 1000, actualCost: 900, budgetCost: 1000 },
  { qualifiedMeals: 980, totalMeals: 1000, satisfiedPatients: 920, surveyedPatients: 1000, actualCost: 900, budgetCost: 1000 },
];

describe("computeCateringQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("膳食合格率 = 98.00%", () => {
    expect(computeCateringQualifiedRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeCateringQualifiedRateV13([])).toBe(0);
  });
});

describe("computeCateringPatientSatisfactionRateV13", () => {
  // 算式：(920+920)/(1000+1000)×100 = 1840/2000×100 = 92.00
  it("患者膳食满意度 = 92.00%", () => {
    expect(computeCateringPatientSatisfactionRateV13(records)).toBe(92.00);
  });
});

describe("computeCateringCostControlRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00（反向，越低越好）
  it("膳食成本控制率 = 90.00%（反向，越低越好）", () => {
    expect(computeCateringCostControlRateV13(records)).toBe(90.00);
  });
});

describe("cateringQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/catering-quality-mgmt 路由存在且 auth:true", () => {
    const route = cateringQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/catering-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
