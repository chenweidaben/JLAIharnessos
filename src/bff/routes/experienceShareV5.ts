/**
 * 健澜科技 jlmedaios - 跨角色经验复用 V5 路由（M275-B）
 *
 * POST /api/v1/experience-share（创建共享规则）
 * GET  /api/v1/experience-share（报告）
 *
 * 权限：experience-share:write / experience-share:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  adaptForRoleV5,
  buildExperienceShareV5Report,
  routeExperienceV5,
  type ShareRule,
} from "../aggregators/experienceShareV5Aggregator.js";

const store: ShareRule[] = [];

export const experienceShareV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/experience-share",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-share:write");
      if (denied) return denied;

      const body = await c.req.json() as { experienceId: string; fromRole: string; visibility: ShareRule["visibility"] };
      const toRoles = routeExperienceV5(body.fromRole);
      const rule: ShareRule = {
        experienceId: body.experienceId,
        fromRole: body.fromRole,
        toRoles,
        visibility: body.visibility,
        consumedCount: 0,
      };
      store.push(rule);
      return json(ok(rule));
    },
  },
  {
    method: "GET",
    path: "/api/v1/experience-share",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-share:read");
      if (denied) return denied;

      const report = buildExperienceShareV5Report(store);
      return json(ok(report));
    },
  },
  {
    method: "GET",
    path: "/api/v1/experience-share/adapted",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-share:read");
      if (denied) return denied;

      const lesson = c.query.get("lesson") ?? "";
      const role = c.query.get("role") ?? "nurse";
      const adapted = adaptForRoleV5({ id: "x", fromRole: "doctor", specialty: "", situation: "", lesson, upvotes: 0 }, role);
      return json(ok(adapted));
    },
  },
];
