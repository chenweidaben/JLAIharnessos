/**
 * 健澜科技 jlmedaios - 病历缺陷根因分析 V14 路由（M468-B）
 *
 * POST /api/v1/emr-root-cause  （auth:true，body 用 await c.req.json()）缺陷列表→根因分析
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  analyzeRootCause,
  buildCauseTree,
} from "../aggregators/emrRootCauseV14Aggregator.js";

export const emrRootCauseV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-root-cause",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-root-cause:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { defects?: string[] };
      const analysis = analyzeRootCause(body.defects ?? []);
      const tree = buildCauseTree(analysis);
      return json(ok({ analysis, tree }));
    },
  },
];
