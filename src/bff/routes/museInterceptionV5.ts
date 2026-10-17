/**
 * 健澜科技 jlmedaios - MUSE 错误拦截与风险避免 V5 路由（M285-B）
 *
 * GET /api/v1/muse-interception（拦截看板）
 * GET /api/v1/muse-interception/avoided（避免损害）
 *
 * 权限：muse-interception:read / muse-interception:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMuseInterceptionV5Report,
  estimateAvoidedHarmV5,
  rankRiskV5,
  type InterceptionEvent,
} from "../aggregators/museInterceptionV5Aggregator.js";

const eventStore: InterceptionEvent[] = [
  { riskType: "药物相互作用", intercepted: true, avoidedHarm: 10, seriousness: "high" },
  { riskType: "剂量错误", intercepted: true, avoidedHarm: 5, seriousness: "medium" },
  { riskType: "检查遗漏", intercepted: false, avoidedHarm: 2, seriousness: "low" },
];

export const museInterceptionV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-interception",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-interception:read");
      if (denied) return denied;

      return json(ok(buildMuseInterceptionV5Report(eventStore)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-interception/avoided",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-interception:read");
      if (denied) return denied;

      return json(ok({
        avoidedHarmTotal: estimateAvoidedHarmV5(eventStore),
        ranking: rankRiskV5(eventStore),
      }));
    },
  },
];
