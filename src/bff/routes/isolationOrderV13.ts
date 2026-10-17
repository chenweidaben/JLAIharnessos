/**
 * 健澜科技 jlmedaios - 隔离医嘱执行率 V13 路由（M341-C）
 *
 * GET /api/v1/isolation-order
 *
 * 权限：isolation-order:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIsolationExecutionRateV13,
  type IsolationOrderRecordV13,
} from "../aggregators/isolationOrderV13Aggregator.js";

const records: IsolationOrderRecordV13[] = [
  { requiredCount: 100, executedCount: 98 },
];

export const isolationOrderV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/isolation-order",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "isolation-order:read");
      if (denied) return denied;
      return json(ok({
        executionRate: computeIsolationExecutionRateV13(records),
      }));
    },
  },
];
