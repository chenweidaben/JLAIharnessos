/**
 * 健澜科技 jlmedaios - 后勤保障 V13 路由（M385-A）
 *
 * GET /api/v1/logistics-support
 *
 * 权限：logistics-support:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBeddingWashCountV13,
  computeCateringSupplyCountV13,
  computePropertyInspectionCountV13,
  type LogisticsSupportRecordV13,
} from "../aggregators/logisticsSupportV13Aggregator.js";

const records: LogisticsSupportRecordV13[] = [
  { beddingWashCount: 1000, cateringSupplyCount: 5000, propertyInspectionCount: 100 },
  { beddingWashCount: 1000, cateringSupplyCount: 5000, propertyInspectionCount: 100 },
];

export const logisticsSupportV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/logistics-support",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "logistics-support:read");
      if (denied) return denied;
      return json(ok({
        beddingWashCount: computeBeddingWashCountV13(records),
        cateringSupplyCount: computeCateringSupplyCountV13(records),
        propertyInspectionCount: computePropertyInspectionCountV13(records),
      }));
    },
  },
];
