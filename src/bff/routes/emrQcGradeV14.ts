/**
 * 健澜科技 jlmedaios - 病历质控等级评定 V14 路由（M479-C）
 *
 * POST /api/v1/emr-qc-grade  （auth:true，body 用 await c.req.json()）根据分数评定等级
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { evaluateQcGrade } from "../aggregators/emrQcGradeV14Aggregator.js";

export const emrQcGradeV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-grade",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-grade:write");
      if (denied) return denied;
      const body = await c.req.json() as { score?: number };
      const result = evaluateQcGrade(body.score ?? 0);
      return json(ok({ result }));
    },
  },
];
