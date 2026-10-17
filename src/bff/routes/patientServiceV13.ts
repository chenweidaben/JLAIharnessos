/**
 * 健澜科技 jlmedaios - 患者服务 V13 路由（M400-A）
 *
 * GET /api/v1/patient-service
 *
 * 权限：patient-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFreeBloodPressureCheckCountV13,
  computeOneStopServiceCenterCountV13,
  computeWheelchairRentalCountV13,
  type PatientServiceRecordV13,
} from "../aggregators/patientServiceV13Aggregator.js";

const records: PatientServiceRecordV13[] = [
  { oneStopCount: 500, wheelchairCount: 100, bpCheckCount: 300 },
  { oneStopCount: 500, wheelchairCount: 100, bpCheckCount: 300 },
];

export const patientServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-service:read");
      if (denied) return denied;
      return json(ok({
        oneStopServiceCenterCount: computeOneStopServiceCenterCountV13(records),
        wheelchairRentalCount: computeWheelchairRentalCountV13(records),
        freeBloodPressureCheckCount: computeFreeBloodPressureCheckCountV13(records),
      }));
    },
  },
];
