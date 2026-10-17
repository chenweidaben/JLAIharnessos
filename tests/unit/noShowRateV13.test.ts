/**
 * 健澜科技 jlmedaios - 门诊爽约率分析 V13 单测（M314-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeptNoShowRateV13,
  computeDoctorNoShowRateV13,
  identifyChronicNoShowPatientsV13,
  type AppointmentV13,
} from "../../src/bff/aggregators/noShowRateV13Aggregator";
import { noShowRateV13Routes } from "../../src/bff/routes/noShowRateV13";

const appointments: AppointmentV13[] = [
  { appointmentId: "a1", dept: "cardio", doctorId: "D01", patientId: "p1", isNoShow: true },
  { appointmentId: "a2", dept: "cardio", doctorId: "D01", patientId: "p2", isNoShow: true },
  { appointmentId: "a3", dept: "cardio", doctorId: "D01", patientId: "p3", isNoShow: true },
  { appointmentId: "a4", dept: "cardio", doctorId: "D01", patientId: "p4", isNoShow: true },
  { appointmentId: "a5", dept: "cardio", doctorId: "D01", patientId: "p5", isNoShow: true },
  { appointmentId: "a6", dept: "cardio", doctorId: "D02", patientId: "p6", isNoShow: false },
  { appointmentId: "a7", dept: "cardio", doctorId: "D02", patientId: "p7", isNoShow: false },
  { appointmentId: "a8", dept: "cardio", doctorId: "D02", patientId: "p8", isNoShow: false },
  { appointmentId: "a9", dept: "cardio", doctorId: "D02", patientId: "p9", isNoShow: false },
  { appointmentId: "a10", dept: "cardio", doctorId: "D02", patientId: "p10", isNoShow: false },
  { appointmentId: "a11", dept: "cardio", doctorId: "D01", patientId: "p11", isNoShow: false },
  { appointmentId: "a12", dept: "cardio", doctorId: "D01", patientId: "p12", isNoShow: false },
  { appointmentId: "a13", dept: "cardio", doctorId: "D01", patientId: "p13", isNoShow: false },
  { appointmentId: "a14", dept: "cardio", doctorId: "D01", patientId: "p14", isNoShow: false },
  { appointmentId: "a15", dept: "cardio", doctorId: "D01", patientId: "p15", isNoShow: false },
  { appointmentId: "a16", dept: "cardio", doctorId: "D01", patientId: "p16", isNoShow: false },
  { appointmentId: "a17", dept: "cardio", doctorId: "D01", patientId: "p17", isNoShow: false },
  { appointmentId: "a18", dept: "cardio", doctorId: "D01", patientId: "p18", isNoShow: false },
  { appointmentId: "a19", dept: "cardio", doctorId: "D01", patientId: "p19", isNoShow: false },
  { appointmentId: "a20", dept: "cardio", doctorId: "D01", patientId: "p20", isNoShow: false },
];

describe("computeDeptNoShowRateV13", () => {
  // 算式：20 预约，5 noShow → 5/20×100 = 25
  it("cardio = 25%", () => {
    expect(computeDeptNoShowRateV13(appointments, "cardio")).toBe(25);
  });
  it("空态 → 0", () => {
    expect(computeDeptNoShowRateV13([], "cardio")).toBe(0);
  });
});

describe("computeDoctorNoShowRateV13", () => {
  // 算式：D01 共 15 预约（a1-a5 noShow + a11-a20 10 个 nonoShow = 15），5 noShow → 5/15×100 = 33
  it("D01 = 33%", () => {
    expect(computeDoctorNoShowRateV13(appointments, "D01")).toBe(33);
  });
  // 算式：D02 共 5 预约，0 noShow → 0%
  it("D02 = 0%", () => {
    expect(computeDoctorNoShowRateV13(appointments, "D02")).toBe(0);
  });
});

describe("identifyChronicNoShowPatientsV13", () => {
  // 算式：p1 连续 3 noShow → streak=3 ≥ 2 标记；p2 1 noShow + 1 nonoShow → max=1 < 2 不标记
  it("threshold=2 → 仅 p1", () => {
    const visits = [
      { patientId: "p1", isNoShow: true },
      { patientId: "p1", isNoShow: true },
      { patientId: "p1", isNoShow: true },
      { patientId: "p2", isNoShow: true },
      { patientId: "p2", isNoShow: false },
    ];
    expect(identifyChronicNoShowPatientsV13(visits, 2)).toEqual(["p1"]);
  });
  it("空态 → []", () => {
    expect(identifyChronicNoShowPatientsV13([], 2).length).toBe(0);
  });
});

describe("noShowRateV13Routes 读路由", () => {
  it("GET /api/v1/no-show-rate 路由存在且 auth:true", () => {
    const route = noShowRateV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/no-show-rate",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
