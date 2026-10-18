/**
 * 健澜科技 jlmedaios - 病案首页质控 V14 路由（M480-C）
 *
 * POST /api/v1/emr-front-page-qc  （auth:true，body 用 await c.req.json()）返回首页校验结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkFrontPageFields, computeFrontPageScore, type FrontPageFieldV14 } from "../aggregators/emrFrontPageQcV14Aggregator.js";

export const emrFrontPageQcV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-front-page-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-front-page-qc:write");
      if (denied) return denied;
      const body = await c.req.json() as { fields?: FrontPageFieldV14[] };
      const fields = body.fields ?? [];
      const result = checkFrontPageFields(fields);
      const score = computeFrontPageScore(result);
      return json(ok({ result, score }));
    },
  },
];
