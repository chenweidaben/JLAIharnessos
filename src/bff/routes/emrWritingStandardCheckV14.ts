/**
 * 健澜科技 jlmedaios - 病历书写规范检查 V14 路由（M485-A）
 *
 * POST /api/v1/emr-writing-standard-check  （auth:true，body 用 await c.req.json()）返回检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkWritingStandard, buildWritingStandardReport } from "../aggregators/emrWritingStandardCheckV14Aggregator.js";

export const emrWritingStandardCheckV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-writing-standard-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-writing-standard-check:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = checkWritingStandard(content);
      const report = buildWritingStandardReport(result);
      return json(ok({ result, report }));
    },
  },
];
