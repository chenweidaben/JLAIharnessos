/**
 * 健澜科技 jlmedaios - 检验差错率 V13 路由（M338-C）
 *
 * GET /api/v1/lab-error
 *
 * 权限：lab-error:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEQAFailureRateV13,
  computeQCFailureCountV13,
  type LabErrorRecordV13,
} from "../aggregators/labErrorV13Aggregator.js";

const records: LabErrorRecordV13[] = [
  { qcFailureCount: 3, eqaTotalItems: 10, eqaFailedItems: 1 },
  { qcFailureCount: 2, eqaTotalItems: 10, eqaFailedItems: 1 },
];

export const labErrorV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/lab-error",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "lab-error:read");
      if (denied) return denied;
      return json(ok({
        qcFailureCount: computeQCFailureCountV13(records),
        eqaFailureRate: computeEQAFailureRateV13(records),
      }));
    },
  },
];
