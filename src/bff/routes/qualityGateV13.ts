/**
 * 健澜科技 jlmedaios - 质量门禁总览 V13 路由（M299-D）
 *
 * GET /api/v1/quality-gate
 *
 * 权限：quality-gate:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQualityGateDashboardV13,
  computeQualityPassRateV13,
  identifyQualityRiskV13,
} from "../aggregators/qualityGateV13Aggregator.js";

const pending = [{ id: 1 }, { id: 2 }, { id: 3 }];
const approved = [{ id: 10 }, { id: 11 }, { id: 12 }, { id: 13 }];
const rejected = [{ id: 20 }];
const rolledbacks = [{ id: 30 }];
const reviewers = [{ id: "d-1" }, { id: "d-4" }];

export const qualityGateV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/quality-gate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "quality-gate:read");
      if (denied) return denied;
      const dashboard = buildQualityGateDashboardV13(pending, approved, rejected, rolledbacks, reviewers);
      return json(ok({
        ...dashboard,
        passRate: computeQualityPassRateV13(dashboard.approvedCount, dashboard.rejectedCount),
        risk: identifyQualityRiskV13(dashboard),
      }));
    },
  },
];
