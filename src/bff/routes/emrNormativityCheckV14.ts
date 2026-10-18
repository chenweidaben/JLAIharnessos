/**
 * 健澜科技 jlmedaios - 病历规范性检查 V14 路由（M476-D，M476 收官）
 *
 * POST /api/v1/emr-normativity-check  （auth:true，body 用 await c.req.json()）返回规范性检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkNormativity } from "../aggregators/emrNormativityCheckV14Aggregator.js";

export const emrNormativityCheckV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-normativity-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-normativity-check:write");
      if (denied) return denied;
      const body = await c.req.json() as { content?: string };
      const content = body.content ?? "";
      const result = checkNormativity(content);
      return json(ok({ result }));
    },
  },
];
