/**
 * 健澜科技 jlmedaios - 门诊爽约率分析 V13 路由（M314-A）
 *
 * GET /api/v1/no-show-rate?dept=
 *
 * 权限：no-show-rate:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeptNoShowRateV13,
  computeDoctorNoShowRateV13,
  identifyChronicNoShowPatientsV13,
  type AppointmentV13,
} from "../aggregators/noShowRateV13Aggregator.js";

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

const visits = [
  { patientId: "p1", isNoShow: true },
  { patientId: "p1", isNoShow: true },
  { patientId: "p1", isNoShow: true },
  { patientId: "p2", isNoShow: true },
  { patientId: "p2", isNoShow: false },
];

export const noShowRateV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/no-show-rate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "no-show-rate:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      return json(ok({
        dept,
        deptRate: computeDeptNoShowRateV13(appointments, dept),
        doctorRates: [
          { doctorId: "D01", rate: computeDoctorNoShowRateV13(appointments, "D01") },
          { doctorId: "D02", rate: computeDoctorNoShowRateV13(appointments, "D02") },
        ],
        chronicPatients: identifyChronicNoShowPatientsV13(visits, 2),
      }));
    },
  },
];
