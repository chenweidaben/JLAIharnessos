/**
 * 健澜科技 jlmedaios - 质控整改验证 V14 路由（M496-B）
 *
 * POST /api/v1/emr-qc-rectify-verify  （auth:true，body 用 await c.req.json()）整改验证提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { verifyRectification, buildVerifyReport } from "../aggregators/emrQcRectifyVerifyV14Aggregator.js";

export const emrQcRectifyVerifyV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-rectify-verify",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rectify-verify:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        issue?: string;
        result?: string;
      };
      const record = verifyRectification(body.issue ?? "", body.result ?? "通过");
      const report = buildVerifyReport(2, 3);
      return json(ok({ record, report }));
    },
  },
];
