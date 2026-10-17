/**
 * 健澜科技 jlmedaios - 错误经验拦截与回滚 V13 路由（M299-B）
 *
 * POST /api/v1/experience/:id/rollback（auth）
 * GET  /api/v1/rollback-report
 *
 * 权限：experience:rollback / rollback-report:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRollbackReportV13,
  rollbackExperienceV13,
} from "../aggregators/rollbackV13Aggregator.js";

export const rollbackV13Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/experience/:id/rollback",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience:rollback");
      if (denied) return denied;
      const rollback = rollbackExperienceV13(c.params.id, "内容有误");
      return json(ok(buildRollbackReportV13(rollback, 3)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/rollback-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rollback-report:read");
      if (denied) return denied;
      return json(ok(buildRollbackReportV13(rollbackExperienceV13("e-1", "内容有误"), 3)));
    },
  },
];
