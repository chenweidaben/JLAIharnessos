/**
 * 健澜科技 jlmedaios - 血糖管理 V13 单测（M424-D，M424 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBloodGlucoseMonitoringComplianceRateV13,
  computeBloodGlucoseTargetAchieveRateV13,
  computeHypoglycemiaOccurrenceRateV13,
  type BloodGlucoseMgmtRecordV13,
} from "../../src/bff/aggregators/bloodGlucoseMgmtV13Aggregator";
import { bloodGlucoseMgmtV13Routes } from "../../src/bff/routes/bloodGlucoseMgmtV13";

const records: BloodGlucoseMgmtRecordV13[] = [
  { compliantMon: 980, shouldMon: 1000, targetAchieved: 900, monitoredPatients: 1000, hypoOccurred: 5, totalMon: 10000 },
  { compliantMon: 980, shouldMon: 1000, targetAchieved: 900, monitoredPatients: 1000, hypoOccurred: 5, totalMon: 10000 },
];

describe("computeBloodGlucoseMonitoringComplianceRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("血糖监测规范率 = 98.00%", () => {
    expect(computeBloodGlucoseMonitoringComplianceRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeBloodGlucoseMonitoringComplianceRateV13([])).toBe(0);
  });
});

describe("computeBloodGlucoseTargetAchieveRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("血糖达标率 = 90.00%", () => {
    expect(computeBloodGlucoseTargetAchieveRateV13(records)).toBe(90.00);
  });
});

describe("computeHypoglycemiaOccurrenceRateV13", () => {
  // 算式：(5+5)/(10000+10000)×100 = 10/20000×100 = 0.05（反向指标，越低越好）
  it("低血糖发生率 = 0.05%（反向指标）", () => {
    expect(computeHypoglycemiaOccurrenceRateV13(records)).toBe(0.05);
  });
});

describe("bloodGlucoseMgmtV13Routes 读路由", () => {
  it("GET /api/v1/blood-glucose-mgmt 路由存在且 auth:true", () => {
    const route = bloodGlucoseMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-glucose-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
