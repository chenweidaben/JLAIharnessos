/**
 * 健澜科技 jlmedaios - 慢病管理达标率 V13 单测（M316-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDiabetesControlRateV13,
  computeHypertensionControlRateV13,
  groupByDoctorV13,
  type ChronicPatientV13,
} from "../../src/bff/aggregators/chronicDiseaseMgmtV13Aggregator";
import { chronicDiseaseMgmtV13Routes } from "../../src/bff/routes/chronicDiseaseMgmtV13";

const patients: ChronicPatientV13[] = [
  { patientId: "p1", doctorId: "D01", sbp: 130, dbp: 80, hba1c: 6.5 },
  { patientId: "p2", doctorId: "D01", sbp: 125, dbp: 75, hba1c: 6.8 },
  { patientId: "p3", doctorId: "D01", sbp: 135, dbp: 85, hba1c: 7.2 },
  { patientId: "p4", doctorId: "D01", sbp: 128, dbp: 78, hba1c: 6.9 },
  { patientId: "p5", doctorId: "D01", sbp: 150, dbp: 95, hba1c: 8.0 },
  { patientId: "p6", doctorId: "D02", sbp: 132, dbp: 82, hba1c: 6.6 },
  { patientId: "p7", doctorId: "D02", sbp: 128, dbp: 76, hba1c: 6.7 },
  { patientId: "p8", doctorId: "D02", sbp: 145, dbp: 92, hba1c: 7.5 },
  { patientId: "p9", doctorId: "D02", sbp: 155, dbp: 98, hba1c: 8.5 },
  { patientId: "p10", doctorId: "D02", sbp: 138, dbp: 88, hba1c: 7.0 },
];

describe("computeHypertensionControlRateV13", () => {
  // 算式：10 患者中 SBP<140 且 DBP<90 的有 p1/p2/p3/p4/p6/p7/p10 = 7 人
  // rate = 7/10×100 = 70
  it("高血压达标率 = 70", () => {
    expect(computeHypertensionControlRateV13(patients)).toBe(70);
  });
  it("空态 → 0", () => {
    expect(computeHypertensionControlRateV13([])).toBe(0);
  });
});

describe("computeDiabetesControlRateV13", () => {
  // 算式：10 患者中 HbA1c<7 的有 p1/p2/p4/p6/p7 = 5 人（p10=7.0 不 <7）
  // rate = 5/10×100 = 50
  it("糖尿病达标率 = 50", () => {
    expect(computeDiabetesControlRateV13(patients)).toBe(50);
  });
});

describe("groupByDoctorV13", () => {
  // 算式：D01 5 患者，达标 p1/p2/p3/p4 = 4 → 4/5×100=80
  // D02 5 患者，达标 p6/p7/p10 = 3 → 3/5×100=60
  it("D01=80, D02=60", () => {
    const groups = groupByDoctorV13(patients);
    const d01 = groups.find((g) => g.doctorId === "D01");
    const d02 = groups.find((g) => g.doctorId === "D02");
    expect(d01?.rate).toBe(80);
    expect(d02?.rate).toBe(60);
  });
});

describe("chronicDiseaseMgmtV13Routes 读路由", () => {
  it("GET /api/v1/chronic-disease-mgmt 路由存在且 auth:true", () => {
    const route = chronicDiseaseMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/chronic-disease-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
