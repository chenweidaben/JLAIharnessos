/**
 * 健澜科技 jlmedaios - 医联体分级诊疗智能化 V5 路由（M262-B）
 *
 * GET /api/v1/medical-alliance-v5/report
 *
 * 权限：medical-alliance-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMedicalAllianceV5Report } from "../aggregators/medicalAllianceV5ReportAggregator.js";

export const medicalAllianceV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-alliance-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-alliance-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMedicalAllianceV5Report(timeRange);
      return json(ok(result));
    },
  },
];
