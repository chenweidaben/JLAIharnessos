/**
 * 健澜科技 jlmedaios - 病历术语规范检查 V14 路由（M485-C）
 *
 * POST /api/v1/emr-terminology-check  （auth:true，body 用 await c.req.json()）返回术语检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkTerminology, buildTerminologyReport } from "../aggregators/emrTerminologyCheckV14Aggregator.js";

export const emrTerminologyCheckV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-terminology-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-terminology-check:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = checkTerminology(content);
      const report = buildTerminologyReport(result);
      return json(ok({ result, report }));
    },
  },
];
