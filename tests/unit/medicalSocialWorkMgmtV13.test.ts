/**
 * 健澜科技 jlmedaios - 医务社工管理 V13 单测（M420-D，M420 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDoctorPatientCommunicationCoordinationRateV13,
  computeHardshipPatientAidRateV13,
  computeSocialWorkServiceVisitsV13,
  type MedicalSocialWorkMgmtRecordV13,
} from "../../src/bff/aggregators/medicalSocialWorkMgmtV13Aggregator";
import { medicalSocialWorkMgmtV13Routes } from "../../src/bff/routes/medicalSocialWorkMgmtV13";

const records: MedicalSocialWorkMgmtRecordV13[] = [
  { serviceVisits: 300, hardshipAided: 950, hardshipTotal: 1000, coordinationSuccess: 980, coordinationTotal: 1000 },
  { serviceVisits: 500, hardshipAided: 950, hardshipTotal: 1000, coordinationSuccess: 980, coordinationTotal: 1000 },
];

describe("computeSocialWorkServiceVisitsV13", () => {
  // 算式：300+500 = 800 人次（整数求和，不是百分比）
  it("社工服务人次 = 800 人次（整数求和）", () => {
    expect(computeSocialWorkServiceVisitsV13(records)).toBe(800);
  });
  it("空态 → 0", () => {
    expect(computeSocialWorkServiceVisitsV13([])).toBe(0);
  });
});

describe("computeHardshipPatientAidRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("困难患者救助率 = 95.00%", () => {
    expect(computeHardshipPatientAidRateV13(records)).toBe(95.00);
  });
});

describe("computeDoctorPatientCommunicationCoordinationRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("医患沟通协调成功率 = 98.00%", () => {
    expect(computeDoctorPatientCommunicationCoordinationRateV13(records)).toBe(98.00);
  });
});

describe("medicalSocialWorkMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-social-work-mgmt 路由存在且 auth:true", () => {
    const route = medicalSocialWorkMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-social-work-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
