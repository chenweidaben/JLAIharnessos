/**
 * 健澜科技 jlmedaios - 院感监测（细节）V13 单测（M421-A，detail 避让旧版 infectionReportMgmtV13/infectionControlDetailV13 等院感系列）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEnvironmentalHygieneMonitoringPassRateV13,
  computeHospitalInfectionIncidenceRateV13,
  computeHospitalInfectionMissingReportRateV13,
  type InfectionSurveillanceDetailRecordV13,
} from "../../src/bff/aggregators/infectionSurveillanceDetailV13Aggregator";
import { infectionSurveillanceDetailV13Routes } from "../../src/bff/routes/infectionSurveillanceDetailV13";

const records: InfectionSurveillanceDetailRecordV13[] = [
  { infectionPatientCount: 20, dischargePatientTotal: 1000, missingReport: 2, shouldReport: 100, envSampleQualified: 980, envSampleTotal: 1000 },
  { infectionPatientCount: 20, dischargePatientTotal: 1000, missingReport: 2, shouldReport: 100, envSampleQualified: 980, envSampleTotal: 1000 },
];

describe("computeHospitalInfectionIncidenceRateV13", () => {
  // 算式：(20+20)/(1000+1000)×100 = 40/2000×100 = 2.00（反向指标，越低越好）
  it("医院感染发病率 = 2.00%（反向指标）", () => {
    expect(computeHospitalInfectionIncidenceRateV13(records)).toBe(2.00);
  });
  it("空态 → 0", () => {
    expect(computeHospitalInfectionIncidenceRateV13([])).toBe(0);
  });
});

describe("computeHospitalInfectionMissingReportRateV13", () => {
  // 算式：(2+2)/(100+100)×100 = 4/200×100 = 2.00（反向指标，越低越好）
  it("医院感染漏报率 = 2.00%（反向指标）", () => {
    expect(computeHospitalInfectionMissingReportRateV13(records)).toBe(2.00);
  });
});

describe("computeEnvironmentalHygieneMonitoringPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("环境卫生学监测合格率 = 98.00%", () => {
    expect(computeEnvironmentalHygieneMonitoringPassRateV13(records)).toBe(98.00);
  });
});

describe("infectionSurveillanceDetailV13Routes 读路由", () => {
  it("GET /api/v1/infection-surveillance-detail 路由存在且 auth:true", () => {
    const route = infectionSurveillanceDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/infection-surveillance-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
