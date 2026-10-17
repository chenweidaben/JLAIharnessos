/**
 * 健澜科技 jlmedaios - 导医服务 V13 路由（M378-B）
 *
 * GET /api/v1/guide-service
 *
 * 权限：guide-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAccessibilityServiceCountV13,
  computeGuideServiceCountV13,
  computeTriageAccuracyRateV13,
  type GuideServiceRecordV13,
} from "../aggregators/guideServiceV13Aggregator.js";

const records: GuideServiceRecordV13[] = [
  { guideServiceCount: 500, triageTotalCount: 100, triageAccurateCount: 98, accessibilityServiceCount: 100 },
  { guideServiceCount: 500, triageTotalCount: 100, triageAccurateCount: 98, accessibilityServiceCount: 100 },
];

export const guideServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/guide-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "guide-service:read");
      if (denied) return denied;
      return json(ok({
        guideServiceCount: computeGuideServiceCountV13(records),
        triageAccuracyRate: computeTriageAccuracyRateV13(records),
        accessibilityServiceCount: computeAccessibilityServiceCountV13(records),
      }));
    },
  },
];
