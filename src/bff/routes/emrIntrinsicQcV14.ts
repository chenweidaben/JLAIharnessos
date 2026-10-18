/**
 * 健澜科技 jlmedaios - 病历内涵质控 V14 路由（M477-A）
 *
 * POST /api/v1/emr-intrinsic-qc  （auth:true，body 用 await c.req.json()）返回内涵质控结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { runIntrinsicQc } from "../aggregators/emrIntrinsicQcV14Aggregator.js";

export const emrIntrinsicQcV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-intrinsic-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-intrinsic-qc:write");
      if (denied) return denied;
      const body = await c.req.json() as { content?: string };
      const content = body.content ?? "";
      const result = runIntrinsicQc(content);
      return json(ok({ result }));
    },
  },
];
