/**
 * 健澜科技 jlmedaios - 检验质控 V13 路由（M392-A）
 *
 * GET /api/v1/lab-quality-control
 *
 * 权限：lab-quality-control:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCriticalValueReportTimelyRateV13,
  computeEQAQQualificationRateV13,
  computeIQCQualificationRateV13,
  type LabQualityControlRecordV13,
} from "../aggregators/labQualityControlV13Aggregator.js";

const records: LabQualityControlRecordV13[] = [
  { iqcQualifiedCount: 950, iqcTotalCount: 1000, eqaQualifiedCount: 900, eqaTotalCount: 1000, timelyCount: 980, criticalTotalCount: 1000 },
  { iqcQualifiedCount: 950, iqcTotalCount: 1000, eqaQualifiedCount: 900, eqaTotalCount: 1000, timelyCount: 980, criticalTotalCount: 1000 },
];

export const labQualityControlV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/lab-quality-control",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "lab-quality-control:read");
      if (denied) return denied;
      return json(ok({
        iqcQualificationRate: computeIQCQualificationRateV13(records),
        eqaqQualificationRate: computeEQAQQualificationRateV13(records),
        criticalValueReportTimelyRate: computeCriticalValueReportTimelyRateV13(records),
      }));
    },
  },
];
