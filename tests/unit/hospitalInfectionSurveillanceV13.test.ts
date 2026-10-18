/**
 * 健澜科技 jlmedaios - 院感监测管理 V13 单测（M441-A，医院感染管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHospitalInfectionMissReportRateV13,
  computeHospitalInfectionRateV13,
  computeHospitalInfectionTargetedMonitoringRateV13,
  type HospitalInfectionSurveillanceRecordV13,
} from "../../src/bff/aggregators/hospitalInfectionSurveillanceV13Aggregator";
import { hospitalInfectionSurveillanceV13Routes } from "../../src/bff/routes/hospitalInfectionSurveillanceV13";

const records: HospitalInfectionSurveillanceRecordV13[] = [
  { hospitalInfectionCount: 50, totalInpatient: 1000, missReportCount: 5, totalInfection: 1000, targetedMonitoringDept: 95, shouldMonitorDept: 100 },
  { hospitalInfectionCount: 50, totalInpatient: 1000, missReportCount: 5, totalInfection: 1000, targetedMonitoringDept: 95, shouldMonitorDept: 100 },
];

describe("computeHospitalInfectionRateV13", () => {
  // 算式：(50+50)/(1000+1000)×100 = 100/2000×100 = 5.00%（反向，越低越好）
  it("院感发生率 = 5.00%（反向，越低越好）", () => {
    expect(computeHospitalInfectionRateV13(records)).toBe(5.00);
  });
  it("空态 → 0", () => {
    expect(computeHospitalInfectionRateV13([])).toBe(0);
  });
});

describe("computeHospitalInfectionMissReportRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50%（反向，越低越好）
  it("院感漏报率 = 0.50%（反向，越低越好）", () => {
    expect(computeHospitalInfectionMissReportRateV13(records)).toBe(0.50);
  });
});

describe("computeHospitalInfectionTargetedMonitoringRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00%
  it("目标性监测覆盖率 = 95.00%", () => {
    expect(computeHospitalInfectionTargetedMonitoringRateV13(records)).toBe(95.00);
  });
});

describe("hospitalInfectionSurveillanceV13Routes 读路由", () => {
  it("GET /api/v1/hospital-infection-surveillance 路由存在且 auth:true", () => {
    const route = hospitalInfectionSurveillanceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hospital-infection-surveillance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
