/**
 * 健澜科技 jlmedaios - 环境卫生质量管理 V13 单测（M437-C，后勤保障与环境管理深化组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEnvironmentalHygieneCleaningQualifiedRateV13,
  computeEnvironmentalHygieneMonitoringQualifiedRateV13,
  computeEnvironmentalHygieneSatisfactionRateV13,
  type EnvironmentalHygieneQualityMgmtRecordV13,
} from "../../src/bff/aggregators/environmentalHygieneQualityMgmtV13Aggregator";
import { environmentalHygieneQualityMgmtV13Routes } from "../../src/bff/routes/environmentalHygieneQualityMgmtV13";

const records: EnvironmentalHygieneQualityMgmtRecordV13[] = [
  { qualifiedMonitoring: 980, totalMonitoring: 1000, qualifiedCleaning: 960, totalCleaning: 1000, satisfiedPatients: 920, surveyedPatients: 1000 },
  { qualifiedMonitoring: 980, totalMonitoring: 1000, qualifiedCleaning: 960, totalCleaning: 1000, satisfiedPatients: 920, surveyedPatients: 1000 },
];

describe("computeEnvironmentalHygieneMonitoringQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("环境监测合格率 = 98.00%", () => {
    expect(computeEnvironmentalHygieneMonitoringQualifiedRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeEnvironmentalHygieneMonitoringQualifiedRateV13([])).toBe(0);
  });
});

describe("computeEnvironmentalHygieneCleaningQualifiedRateV13", () => {
  // 算式：(960+960)/(1000+1000)×100 = 1920/2000×100 = 96.00
  it("保洁合格率 = 96.00%", () => {
    expect(computeEnvironmentalHygieneCleaningQualifiedRateV13(records)).toBe(96.00);
  });
});

describe("computeEnvironmentalHygieneSatisfactionRateV13", () => {
  // 算式：(920+920)/(1000+1000)×100 = 1840/2000×100 = 92.00
  it("满意度 = 92.00%", () => {
    expect(computeEnvironmentalHygieneSatisfactionRateV13(records)).toBe(92.00);
  });
});

describe("environmentalHygieneQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/environmental-hygiene-quality-mgmt 路由存在且 auth:true", () => {
    const route = environmentalHygieneQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/environmental-hygiene-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
