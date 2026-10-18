/**
 * 健澜科技 jlmedaios - 出院病历质控 V14 路由（M481-C）
 *
 * POST /api/v1/emr-discharge-qc  （auth:true，body 用 await c.req.json()）返回出院病历质控结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkDischargeReadiness, computeDischargeScore, type DischargeItemV14 } from "../aggregators/emrDischargeQcV14Aggregator.js";

export const emrDischargeQcV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-discharge-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-discharge-qc:write");
      if (denied) return denied;
      const body = await c.req.json() as { items?: DischargeItemV14[] };
      const items = body.items ?? [];
      const result = checkDischargeReadiness(items);
      const score = computeDischargeScore(result);
      return json(ok({ result, score }));
    },
  },
];
