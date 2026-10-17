/**
 * 健澜科技 jlmedaios - 医生 MUSE 工作台 V5 路由（M283-A）
 *
 * GET  /api/v1/muse-doctor（工作台）
 * GET  /api/v1/muse-doctor/prioritized（待办优先级）
 * POST /api/v1/muse-doctor/read（已读）
 *
 * 权限：muse-doctor:read / muse-doctor:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDoctorDailyV5,
  prioritizePatientsV5,
  suggestExperienceV5,
  type WardPatient,
} from "../aggregators/museDoctorV5Aggregator.js";

const patientStore: WardPatient[] = [
  { patientId: "p-001", name: "张三", severity: 9, lastRoundHoursAgo: 6, pendingTests: 2 },
  { patientId: "p-002", name: "李四", severity: 5, lastRoundHoursAgo: 2, pendingTests: 0 },
  { patientId: "p-003", name: "王五", severity: 8, lastRoundHoursAgo: 4, pendingTests: 1 },
];

const adviceStore = [
  { patientId: "p-001", type: "复查肌钙蛋白", confidence: 0.92 },
  { patientId: "p-003", type: "复查CT", confidence: 0.85 },
];

export const museDoctorV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-doctor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-doctor:read");
      if (denied) return denied;

      const doctorId = c.query.get("doctorId") ?? "doc-001";
      const summary = buildDoctorDailyV5(doctorId, patientStore, adviceStore);
      const tips = suggestExperienceV5({ diagnosis: "急性心梗", department: "心内科" });
      return json(ok({ ...summary, experienceTips: tips }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-doctor/prioritized",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-doctor:read");
      if (denied) return denied;

      return json(ok(prioritizePatientsV5(patientStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-doctor/read",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-doctor:write");
      if (denied) return denied;

      const body = await c.req.json() as { patientId: string };
      return json(ok({ markedRead: true, patientId: body.patientId }));
    },
  },
];
