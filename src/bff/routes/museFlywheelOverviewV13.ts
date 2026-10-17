/**
 * 健澜科技 jlmedaios - 五角色 MUSE 飞轮总览 V13 路由（M321-A）
 *
 * GET /api/v1/muse-flywheel-overview
 *
 * 权限：muse-flywheel-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRoleComparisonV13,
  computeTotalCallsV13,
  identifyLeadingRoleV13,
  type RoleFlywheelV13,
} from "../aggregators/museFlywheelOverviewV13Aggregator.js";

const roles: RoleFlywheelV13[] = [
  { role: "doctor", callCount: 100, hitRate: 80, adoptionRate: 80 },
  { role: "nurse", callCount: 50, hitRate: 85, adoptionRate: 85 },
  { role: "pharmacist", callCount: 30, hitRate: 90, adoptionRate: 90 },
  { role: "admin", callCount: 20, hitRate: 75, adoptionRate: 75 },
  { role: "patient", callCount: 10, hitRate: 70, adoptionRate: 70 },
];

export const museFlywheelOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-flywheel-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-flywheel-overview:read");
      if (denied) return denied;
      return json(ok({
        roleComparison: buildRoleComparisonV13(roles),
        totalCalls: computeTotalCallsV13(roles),
        leadingRole: identifyLeadingRoleV13(roles),
      }));
    },
  },
];
