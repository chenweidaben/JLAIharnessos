/**
 * 健澜科技 jlmedaios - SOP 引用次数回灌飞轮分 V13 路由（M309-B）
 *
 * GET /api/v1/sop-usage?doctorId=
 *
 * 权限：sop-usage:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  creditDoctorBySopUsageV13,
  rollbackSopUsageToFlywheelV13,
  type DoctorCreditV13,
} from "../aggregators/sopUsageV13Aggregator.js";

const doctors: DoctorCreditV13[] = [
  { doctorId: "d1", baseScore: 50, usageCount: 5 },
  { doctorId: "d2", baseScore: 40, usageCount: 4 },
  { doctorId: "d3", baseScore: 30, usageCount: 3 },
];

const prevFlywheelScore = 66.6;

export const sopUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/sop-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "sop-usage:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const doctorId = url.searchParams.get("doctorId");
      const scoped = doctorId ? doctors.filter((d) => d.doctorId === doctorId) : doctors;
      return json(ok({
        doctors: scoped.map((d) => ({
          ...d,
          newScore: creditDoctorBySopUsageV13(d, d.usageCount),
        })),
        newFlywheelScore: rollbackSopUsageToFlywheelV13(doctors, prevFlywheelScore),
      }));
    },
  },
];
