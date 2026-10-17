/**
 * 健澜科技 jlmedaios - 医生工作量 V13 路由（M330-A）
 *
 * GET /api/v1/doctor-workload
 *
 * 权限：doctor-workload:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgInpatientDaysV13,
  computeAvgOutpatientV13,
  computeTotalSurgeriesV13,
  type DoctorWorkloadV13,
} from "../aggregators/doctorWorkloadV13Aggregator.js";

const doctors: DoctorWorkloadV13[] = [
  { doctorName: "张医生", outpatientCount: 100, inpatientDays: 50, surgeryCount: 10 },
  { doctorName: "李医生", outpatientCount: 120, inpatientDays: 60, surgeryCount: 15 },
  { doctorName: "王医生", outpatientCount: 80, inpatientDays: 40, surgeryCount: 5 },
];

export const doctorWorkloadV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/doctor-workload",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "doctor-workload:read");
      if (denied) return denied;
      return json(ok({
        avgOutpatient: computeAvgOutpatientV13(doctors),
        avgInpatientDays: computeAvgInpatientDaysV13(doctors),
        totalSurgeries: computeTotalSurgeriesV13(doctors),
      }));
    },
  },
];
