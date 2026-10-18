/**
 * 健澜科技 jlmedaios - 质控干预建议生成 V14 路由（M495-D，M495 收官）
 *
 * POST /api/v1/emr-qc-intervention  （auth:true，body 用 await c.req.json()）生成干预建议
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { generateIntervention, buildInterventionReport } from "../aggregators/emrQcInterventionV14Aggregator.js";

export const emrQcInterventionV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-intervention",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-intervention:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        level?: string;
      };
      const level = body.level ?? "中风险";
      const intervention = generateIntervention(level);
      const report = buildInterventionReport(level, intervention.suggestion);
      return json(ok({ intervention, report }));
    },
  },
];
