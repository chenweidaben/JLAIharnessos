/**
 * 健澜科技 jlmedaios - 处方点评合格率 V13 单测（M318-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyIrrationalTypesV13,
  computeDoctorPassRateV13,
  computePrescriptionPassRateV13,
  type PrescriptionV13,
} from "../../src/bff/aggregators/prescriptionAuditV13Aggregator";
import { prescriptionAuditV13Routes } from "../../src/bff/routes/prescriptionAuditV13";

const prescriptions: PrescriptionV13[] = [
  { prescriptionId: "p1", dept: "cardio", doctorId: "D01", isPass: true, irrationalType: null },
  { prescriptionId: "p2", dept: "cardio", doctorId: "D01", isPass: true, irrationalType: null },
  { prescriptionId: "p3", dept: "cardio", doctorId: "D01", isPass: true, irrationalType: null },
  { prescriptionId: "p4", dept: "cardio", doctorId: "D01", isPass: true, irrationalType: null },
  { prescriptionId: "p5", dept: "cardio", doctorId: "D01", isPass: false, irrationalType: "indication" },
  { prescriptionId: "p6", dept: "cardio", doctorId: "D02", isPass: true, irrationalType: null },
  { prescriptionId: "p7", dept: "cardio", doctorId: "D02", isPass: true, irrationalType: null },
  { prescriptionId: "p8", dept: "cardio", doctorId: "D02", isPass: true, irrationalType: null },
  { prescriptionId: "p9", dept: "cardio", doctorId: "D02", isPass: true, irrationalType: null },
  { prescriptionId: "p10", dept: "cardio", doctorId: "D02", isPass: false, irrationalType: "dosage" },
  { prescriptionId: "p11", dept: "cardio", doctorId: "D03", isPass: false, irrationalType: "duplicate" },
  { prescriptionId: "p12", dept: "cardio", doctorId: "D03", isPass: false, irrationalType: "interaction" },
];

describe("computePrescriptionPassRateV13", () => {
  // 算式：cardio 12 处方中合格 = p1-p4 + p6-p9 = 8
  // rate = 8/12×100 = 66.67 → round = 67
  it("cardio passRate = 67", () => {
    expect(computePrescriptionPassRateV13(prescriptions, "cardio")).toBe(67);
  });
  it("空态 → 0", () => {
    expect(computePrescriptionPassRateV13([], "cardio")).toBe(0);
  });
});

describe("classifyIrrationalTypesV13", () => {
  // 算式：indication=1(p5), dosage=1(p10), duplicate=1(p11), interaction=1(p12)
  it("indication=1, dosage=1, duplicate=1, interaction=1", () => {
    const c = classifyIrrationalTypesV13(prescriptions);
    expect(c.indication).toBe(1);
    expect(c.dosage).toBe(1);
    expect(c.duplicate).toBe(1);
    expect(c.interaction).toBe(1);
  });
});

describe("computeDoctorPassRateV13", () => {
  // 算式：D01 5 处方中合格 = p1-p4 = 4 → 4/5×100 = 80
  it("D01 passRate = 80", () => {
    expect(computeDoctorPassRateV13(prescriptions, "D01")).toBe(80);
  });
  // 算式：D03 2 处方中合格 = 0 → 0/2×100 = 0
  it("D03 passRate = 0", () => {
    expect(computeDoctorPassRateV13(prescriptions, "D03")).toBe(0);
  });
});

describe("prescriptionAuditV13Routes 读路由", () => {
  it("GET /api/v1/prescription-audit 路由存在且 auth:true", () => {
    const route = prescriptionAuditV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/prescription-audit",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
