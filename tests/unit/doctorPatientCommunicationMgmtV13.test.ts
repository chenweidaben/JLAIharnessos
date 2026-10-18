/**
 * 健澜科技 jlmedaios - 医患沟通管理 V13 单测（M451-A，医患关系与投诉管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDoctorPatientCommunicationComplaintOccurrenceRateV13,
  computeDoctorPatientCommunicationInformedConsentSignRateV13,
  computeDoctorPatientCommunicationRecordCompletenessRateV13,
  type DoctorPatientCommunicationMgmtRecordV13,
} from "../../src/bff/aggregators/doctorPatientCommunicationMgmtV13Aggregator";
import { doctorPatientCommunicationMgmtV13Routes } from "../../src/bff/routes/doctorPatientCommunicationMgmtV13";

const records: DoctorPatientCommunicationMgmtRecordV13[] = [
  { complete: 950, totalRecord: 1000, signed: 900, shouldSign: 1000, complaint: 30, totalCommunication: 1000 },
  { complete: 950, totalRecord: 1000, signed: 900, shouldSign: 1000, complaint: 30, totalCommunication: 1000 },
];

describe("computeDoctorPatientCommunicationRecordCompletenessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("沟通记录完整率 = 95.00%", () => {
    expect(computeDoctorPatientCommunicationRecordCompletenessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDoctorPatientCommunicationRecordCompletenessRateV13([])).toBe(0);
  });
});

describe("computeDoctorPatientCommunicationInformedConsentSignRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("知情同意书签署率 = 90.00%", () => {
    expect(computeDoctorPatientCommunicationInformedConsentSignRateV13(records)).toBe(90.00);
  });
});

describe("computeDoctorPatientCommunicationComplaintOccurrenceRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00（反向，越低越好）
  it("沟通投诉发生率 = 3.00%（反向，越低越好）", () => {
    expect(computeDoctorPatientCommunicationComplaintOccurrenceRateV13(records)).toBe(3.00);
  });
});

describe("doctorPatientCommunicationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/doctor-patient-communication-mgmt 路由存在且 auth:true", () => {
    const route = doctorPatientCommunicationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/doctor-patient-communication-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
