/**
 * 健澜科技 jlmedaios - 检验服务 V13 路由（M374-B）
 *
 * GET /api/v1/lab-service
 *
 * 权限：lab-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBiochemistryTestCountV13,
  computeBloodRoutineTestCountV13,
  computeImmunologyTestCountV13,
  type LabServiceRecordV13,
} from "../aggregators/labServiceV13Aggregator.js";

const records: LabServiceRecordV13[] = [
  { bloodRoutineCount: 500, biochemistryCount: 400, immunologyCount: 300 },
  { bloodRoutineCount: 500, biochemistryCount: 400, immunologyCount: 300 },
];

export const labServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/lab-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "lab-service:read");
      if (denied) return denied;
      return json(ok({
        bloodRoutineTestCount: computeBloodRoutineTestCountV13(records),
        biochemistryTestCount: computeBiochemistryTestCountV13(records),
        immunologyTestCount: computeImmunologyTestCountV13(records),
      }));
    },
  },
];
