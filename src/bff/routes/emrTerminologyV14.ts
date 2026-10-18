/**
 * 健澜科技 jlmedaios - 病历术语规范 V14 路由（M477-C）
 *
 * POST /api/v1/emr-terminology  （auth:true，body 用 await c.req.json()）返回术语规范检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkTerminology } from "../aggregators/emrTerminologyV14Aggregator.js";

export const emrTerminologyV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-terminology",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-terminology:write");
      if (denied) return denied;
      const body = await c.req.json() as { text?: string };
      const text = body.text ?? "";
      const result = checkTerminology(text);
      return json(ok({ result }));
    },
  },
];
