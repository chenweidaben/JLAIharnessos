/**
 * 健澜科技 jlmedaios - 临床规则引擎 V3 路由（M255-D）
 *
 * GET /api/v1/clinical-rule-engine-v3/report
 *
 * 权限：clinical-rule-engine-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildClinicalRuleEngineV3Report } from "../aggregators/clinicalRuleEngineV3ReportAggregator.js";

export const clinicalRuleEngineV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-rule-engine-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-rule-engine-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildClinicalRuleEngineV3Report(timeRange);
      return json(ok(result));
    },
  },
];
