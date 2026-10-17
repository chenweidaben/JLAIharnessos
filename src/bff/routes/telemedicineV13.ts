/**
 * 健澜科技 jlmedaios - 远程会诊量 V13 路由（M324-C）
 *
 * GET /api/v1/telemedicine-overview
 *
 * 权限：telemedicine-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyConsultByDeptV13,
  computeAvgResponseTimeV13,
  countMonthlyConsultationsV13,
  type TeleconsultationV13,
} from "../aggregators/telemedicineV13Aggregator.js";

const consults: TeleconsultationV13[] = [
  { dept: "心内科", responseMinutes: 15 },
  { dept: "心内科", responseMinutes: 20 },
  { dept: "心内科", responseMinutes: 10 },
  { dept: "呼吸科", responseMinutes: 25 },
  { dept: "呼吸科", responseMinutes: 30 },
  { dept: "呼吸科", responseMinutes: 12 },
  { dept: "呼吸科", responseMinutes: 18 },
  { dept: "神经科", responseMinutes: 22 },
  { dept: "神经科", responseMinutes: 8 },
  { dept: "神经科", responseMinutes: 15 },
];

export const telemedicineV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/telemedicine-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "telemedicine-overview:read");
      if (denied) return denied;
      return json(ok({
        monthlyConsultations: countMonthlyConsultationsV13(consults),
        avgResponseMinutes: computeAvgResponseTimeV13(consults),
        deptDistribution: classifyConsultByDeptV13(consults),
      }));
    },
  },
];
