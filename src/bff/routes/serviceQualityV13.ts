/**
 * 健澜科技 jlmedaios - 服务质量 V13 路由（M386-B）
 *
 * GET /api/v1/service-quality
 *
 * 权限：service-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeServiceStandardComplianceRateV13,
  computeSmileServiceRateV13,
  computeWindowServiceHoursV13,
  type ServiceQualityRecordV13,
} from "../aggregators/serviceQualityV13Aggregator.js";

const records: ServiceQualityRecordV13[] = [
  { compliantCount: 950, totalCheckCount: 1000, windowHours: 8, smileCount: 900, totalServiceCount: 1000 },
  { compliantCount: 950, totalCheckCount: 1000, windowHours: 8, smileCount: 900, totalServiceCount: 1000 },
];

export const serviceQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/service-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "service-quality:read");
      if (denied) return denied;
      return json(ok({
        serviceStandardComplianceRate: computeServiceStandardComplianceRateV13(records),
        windowServiceHours: computeWindowServiceHoursV13(records),
        smileServiceRate: computeSmileServiceRateV13(records),
      }));
    },
  },
];
