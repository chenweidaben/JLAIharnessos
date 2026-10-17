/**
 * 健澜科技 jlmedaios - 患者安全目标 V13 单测（M357-A，stats 避让已有 patientSafetyV13 / M322-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdverseEventReportRateV13,
  computeNosocomialFallRateV13,
  computeNosocomialPressureUlcerRateV13,
  type PatientSafetyStatsRecordV13,
} from "../../src/bff/aggregators/patientSafetyStatsV13Aggregator";
import { patientSafetyStatsV13Routes } from "../../src/bff/routes/patientSafetyStatsV13";

const records: PatientSafetyStatsRecordV13[] = [
  { adverseEventReported: 5, dischargedPatients: 1000, pressureUlcerOccurred: 1, inpatientAdmissions: 2000, fallOccurred: 2 },
  { adverseEventReported: 5, dischargedPatients: 1000, pressureUlcerOccurred: 1, inpatientAdmissions: 2000, fallOccurred: 2 },
];

describe("computeAdverseEventReportRateV13", () => {
  // 算式：(5+5)/(1000+1000) = 10/2000×100 = 0.50
  it("不良事件上报率 = 0.50%", () => {
    expect(computeAdverseEventReportRateV13(records)).toBe(0.50);
  });
  it("空态 → 0", () => {
    expect(computeAdverseEventReportRateV13([])).toBe(0);
  });
});

describe("computeNosocomialPressureUlcerRateV13", () => {
  // 算式：(1+1)/(2000+2000) = 2/4000×100 = 0.05
  it("院内压疮发生率 = 0.05%", () => {
    expect(computeNosocomialPressureUlcerRateV13(records)).toBe(0.05);
  });
});

describe("computeNosocomialFallRateV13", () => {
  // 算式：(2+2)/(2000+2000) = 4/4000×100 = 0.10
  it("院内跌倒发生率 = 0.10%", () => {
    expect(computeNosocomialFallRateV13(records)).toBe(0.10);
  });
});

describe("patientSafetyStatsV13Routes 读路由", () => {
  it("GET /api/v1/patient-safety-stats 路由存在且 auth:true", () => {
    const route = patientSafetyStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-safety-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
