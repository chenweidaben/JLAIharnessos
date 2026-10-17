/**
 * 健澜科技 jlmedaios - 医疗质量总仪表盘 V13 路由（M322-A）
 *
 * GET /api/v1/clinical-quality-dashboard
 *
 * 权限：clinical-quality-dashboard:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQualityDashboardV13,
  computeQualityIndicatorsV13,
  type QualityDashboardInputV13,
} from "../aggregators/clinicalQualityDashboardV13Aggregator.js";

const data: QualityDashboardInputV13 = {
  cmi: 1.2,
  avgStayDays: 8.5,
  bedTurnover: 3.2,
  threeDayDiagnosisRate: 92,
};

export const clinicalQualityDashboardV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-quality-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-quality-dashboard:read");
      if (denied) return denied;
      return json(ok({
        indicators: computeQualityIndicatorsV13(data),
        dashboard: buildQualityDashboardV13(data),
      }));
    },
  },
];
