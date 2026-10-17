/**
 * 健澜科技 jlmedaios - MUSE A/B 测试与效果评估 V5 路由（M285-C）
 *
 * POST /api/v1/muse-ab/design（设计实验）
 * POST /api/v1/muse-ab/decision（提交结果+决策）
 * GET  /api/v1/muse-ab（看板）
 *
 * 权限：muse-ab:read / muse-ab:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  analyzeABV5,
  buildMuseABV5Report,
  decideWinnerV5,
  designABTestV5,
  type ABResult,
} from "../aggregators/museAbV5Aggregator.js";

const resultStore: ABResult[] = [];

export const museAbV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-ab",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-ab:read");
      if (denied) return denied;

      return json(ok(buildMuseABV5Report(resultStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-ab/design",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-ab:write");
      if (denied) return denied;

      const body = await c.req.json() as { hypothesis: string; metric: string };
      return json(ok(designABTestV5(body.hypothesis, body.metric)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-ab/decision",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-ab:write");
      if (denied) return denied;

      const body = await c.req.json() as { result: ABResult };
      resultStore.push(body.result);
      return json(ok({
        analysis: analyzeABV5(body.result),
        decision: decideWinnerV5(body.result),
      }));
    },
  },
];
