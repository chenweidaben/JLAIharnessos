/**
 * 健澜科技 jlmedaios - 预防接种 V13 单测（M349-D，M349 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBoosterRateV13,
  computeCardCreationRateV13,
  computeSingleVaccineRateV13,
  type ImmunizationRecordV13,
} from "../../src/bff/aggregators/immunizationV13Aggregator";
import { immunizationV13Routes } from "../../src/bff/routes/immunizationV13";

const records: ImmunizationRecordV13[] = [
  { cardCreatedCount: 48, shouldCreateCardCount: 50, singleVaccinatedCount: 48, shouldVaccinateCount: 50, boosterDoneCount: 40, shouldBoosterCount: 40 },
  { cardCreatedCount: 47, shouldCreateCardCount: 50, singleVaccinatedCount: 46, shouldVaccinateCount: 50, boosterDoneCount: 38, shouldBoosterCount: 40 },
];

describe("computeCardCreationRateV13", () => {
  // 算式：(48+47)/(50+50) = 95/100×100 = 95.00
  it("建卡率 = 95.00%", () => {
    expect(computeCardCreationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeCardCreationRateV13([])).toBe(0);
  });
});

describe("computeSingleVaccineRateV13", () => {
  // 算式：(48+46)/(50+50) = 94/100×100 = 94.00
  it("单苗接种率 = 94.00%", () => {
    expect(computeSingleVaccineRateV13(records)).toBe(94.00);
  });
});

describe("computeBoosterRateV13", () => {
  // 算式：(40+38)/(40+40) = 78/80×100 = 97.50
  it("加强免疫率 = 97.50%", () => {
    expect(computeBoosterRateV13(records)).toBe(97.50);
  });
});

describe("immunizationV13Routes 读路由", () => {
  it("GET /api/v1/immunization 路由存在且 auth:true", () => {
    const route = immunizationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/immunization",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
