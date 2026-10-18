/**
 * 健澜科技 jlmedaios - DRG 病案质控 V14 路由（M480-A）
 *
 * POST /api/v1/emr-drg-qc  （auth:true，body 用 await c.req.json()）返回 DRG 质控校验结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkDrgCompliance, computeDrgWeight, type DrgQcInputV14 } from "../aggregators/emrDrgQcV14Aggregator.js";

export const emrDrgQcV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-drg-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-drg-qc:write");
      if (denied) return denied;
      const body = await c.req.json() as DrgQcInputV14 & { baseWeight?: number; complicationFactor?: number };
      const result = checkDrgCompliance({
        primaryDx: body.primaryDx ?? "",
        secondaryDx: body.secondaryDx ?? [],
        procedures: body.procedures ?? [],
      });
      const weight = computeDrgWeight(body.baseWeight ?? 1.0, body.complicationFactor ?? 1.0);
      return json(ok({ result, weight }));
    },
  },
];
