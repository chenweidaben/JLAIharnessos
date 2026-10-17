/**
 * 健澜科技 jlmedaios - 后勤服务 V13 路由（M377-A）
 *
 * GET /api/v1/logistics-service
 *
 * 权限：logistics-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBeddingWashCountV13,
  computeMealSupplyCountV13,
  computePropertyWorkOrderCompletionRateV13,
  type LogisticsServiceRecordV13,
} from "../aggregators/logisticsServiceV13Aggregator.js";

const records: LogisticsServiceRecordV13[] = [
  { beddingWashCount: 1000, mealSupplyCount: 3000, workOrderTotalCount: 100, workOrderCompleteCount: 95 },
  { beddingWashCount: 1000, mealSupplyCount: 3000, workOrderTotalCount: 100, workOrderCompleteCount: 95 },
];

export const logisticsServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/logistics-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "logistics-service:read");
      if (denied) return denied;
      return json(ok({
        beddingWashCount: computeBeddingWashCountV13(records),
        mealSupplyCount: computeMealSupplyCountV13(records),
        propertyWorkOrderCompletionRate: computePropertyWorkOrderCompletionRateV13(records),
      }));
    },
  },
];
