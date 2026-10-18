/**
 * 健澜科技 jlmedaios - 压疮风险管理 V13 单测（M439-C，患者安全与医疗风险管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePressureUlcerHealingRateV13,
  computePressureUlcerHighRiskAssessmentRateV13,
  computePressureUlcerHospitalRateV13,
  type PressureUlcerRecordV13,
} from "../../src/bff/aggregators/pressureUlcerV13Aggregator";
import { pressureUlcerV13Routes } from "../../src/bff/routes/pressureUlcerV13";

const records: PressureUlcerRecordV13[] = [
  { hospitalNewPressureUlcer: 15, totalBedDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, healedPressureUlcer: 850, totalPressureUlcer: 1000 },
  { hospitalNewPressureUlcer: 15, totalBedDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, healedPressureUlcer: 850, totalPressureUlcer: 1000 },
];

describe("computePressureUlcerHospitalRateV13", () => {
  // 算式：(15+15)/(10000+10000)×1000 = 30/20000×1000 = 1.50‰（千分率，反向，越低越好）
  it("院内压疮发生率 = 1.50‰（千分率，反向，越低越好）", () => {
    expect(computePressureUlcerHospitalRateV13(records)).toBe(1.50);
  });
  it("空态 → 0", () => {
    expect(computePressureUlcerHospitalRateV13([])).toBe(0);
  });
});

describe("computePressureUlcerHighRiskAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("高危评估率 = 95.00%", () => {
    expect(computePressureUlcerHighRiskAssessmentRateV13(records)).toBe(95.00);
  });
});

describe("computePressureUlcerHealingRateV13", () => {
  // 算式：(850+850)/(1000+1000)×100 = 1700/2000×100 = 85.00
  it("压疮愈合率 = 85.00%", () => {
    expect(computePressureUlcerHealingRateV13(records)).toBe(85.00);
  });
});

describe("pressureUlcerV13Routes 读路由", () => {
  it("GET /api/v1/pressure-ulcer 路由存在且 auth:true", () => {
    const route = pressureUlcerV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pressure-ulcer",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
