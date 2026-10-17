/**
 * 健澜科技 jlmedaios - 服务态度 V13 单测（M365-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDoctorPatientCommunicationScoreV13,
  computeMedicalEthicsScoreV13,
  computeServiceAttitudeScoreV13,
  type ServiceAttitudeRecordV13,
} from "../../src/bff/aggregators/serviceAttitudeV13Aggregator";
import { serviceAttitudeV13Routes } from "../../src/bff/routes/serviceAttitudeV13";

const records: ServiceAttitudeRecordV13[] = [
  { medicalEthicsScore: 95, serviceAttitudeScore: 94, doctorPatientCommunicationScore: 93 },
  { medicalEthicsScore: 97, serviceAttitudeScore: 96, doctorPatientCommunicationScore: 95 },
];

describe("computeMedicalEthicsScoreV13", () => {
  // 算式：(95+97)/2 = 96.00
  it("医德医风评分 = 96.00", () => {
    expect(computeMedicalEthicsScoreV13(records)).toBe(96.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalEthicsScoreV13([])).toBe(0);
  });
});

describe("computeServiceAttitudeScoreV13", () => {
  // 算式：(94+96)/2 = 95.00
  it("服务态度评分 = 95.00", () => {
    expect(computeServiceAttitudeScoreV13(records)).toBe(95.00);
  });
});

describe("computeDoctorPatientCommunicationScoreV13", () => {
  // 算式：(93+95)/2 = 94.00
  it("医患沟通评分 = 94.00", () => {
    expect(computeDoctorPatientCommunicationScoreV13(records)).toBe(94.00);
  });
});

describe("serviceAttitudeV13Routes 读路由", () => {
  it("GET /api/v1/service-attitude 路由存在且 auth:true", () => {
    const route = serviceAttitudeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/service-attitude",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
