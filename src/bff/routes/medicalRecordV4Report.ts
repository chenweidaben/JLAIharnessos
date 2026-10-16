/**
 * 健澜科技 jlmedaios - 病案 V4 路由（M252-B）
 *
 * GET /api/v1/medical-record-v4/report
 *
 * 权限：medical-record-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMedicalRecordV4Report } from "../aggregators/medicalRecordV4ReportAggregator.js";

export const medicalRecordV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMedicalRecordV4Report(timeRange);
      return json(ok(result));
    },
  },
];
