/**
 * 健澜科技 jlmedaios - 护理服务 V13 路由（M376-A）
 *
 * GET /api/v1/nursing-service
 *
 * 权限：nursing-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBasicNursingPassRateV13,
  computeFirstLevelNursingCountV13,
  computeSpecialNursingCountV13,
  type NursingServiceRecordV13,
} from "../aggregators/nursingServiceV13Aggregator.js";

const records: NursingServiceRecordV13[] = [
  { basicNursingCheckCount: 100, basicNursingPassCount: 95, specialNursingCount: 50, firstLevelNursingCount: 200 },
  { basicNursingCheckCount: 100, basicNursingPassCount: 95, specialNursingCount: 50, firstLevelNursingCount: 200 },
];

export const nursingServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-service:read");
      if (denied) return denied;
      return json(ok({
        basicNursingPassRate: computeBasicNursingPassRateV13(records),
        specialNursingCount: computeSpecialNursingCountV13(records),
        firstLevelNursingCount: computeFirstLevelNursingCountV13(records),
      }));
    },
  },
];
