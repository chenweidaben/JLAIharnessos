/**
 * 健澜科技 jlmedaios - 智慧医院分级 V13 单测（M395-A，避让旧版 smartHospitalRatingV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSmartManagementGradeLevelV13,
  computeSmartMedicalGradeLevelV13,
  computeSmartServiceGradeLevelV13,
  type SmartHospitalGradeRecordV13,
} from "../../src/bff/aggregators/smartHospitalGradeV13Aggregator";
import { smartHospitalGradeV13Routes } from "../../src/bff/routes/smartHospitalGradeV13";

const records: SmartHospitalGradeRecordV13[] = [
  { serviceLevel: 3, serviceScore: 85, medicalLevel: 4, medicalScore: 90, managementLevel: 3, managementScore: 88 },
  { serviceLevel: 3, serviceScore: 85, medicalLevel: 4, medicalScore: 90, managementLevel: 3, managementScore: 88 },
];

describe("computeSmartServiceGradeLevelV13", () => {
  // 算式：level=(3+3)/2=3, score=(85+85)/2=85.00
  it("智慧服务分级 = {level: 3, score: 85.00}", () => {
    expect(computeSmartServiceGradeLevelV13(records)).toEqual({ level: 3, score: 85.00 });
  });
  it("空态 → {level: 0, score: 0}", () => {
    expect(computeSmartServiceGradeLevelV13([])).toEqual({ level: 0, score: 0 });
  });
});

describe("computeSmartMedicalGradeLevelV13", () => {
  // 算式：level=(4+4)/2=4, score=(90+90)/2=90.00
  it("智慧医疗分级 = {level: 4, score: 90.00}", () => {
    expect(computeSmartMedicalGradeLevelV13(records)).toEqual({ level: 4, score: 90.00 });
  });
});

describe("computeSmartManagementGradeLevelV13", () => {
  // 算式：level=(3+3)/2=3, score=(88+88)/2=88.00
  it("智慧管理分级 = {level: 3, score: 88.00}", () => {
    expect(computeSmartManagementGradeLevelV13(records)).toEqual({ level: 3, score: 88.00 });
  });
});

describe("smartHospitalGradeV13Routes 读路由", () => {
  it("GET /api/v1/smart-hospital-grade 路由存在且 auth:true", () => {
    const route = smartHospitalGradeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/smart-hospital-grade",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
