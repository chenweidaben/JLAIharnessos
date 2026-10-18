/**
 * 健澜科技 jlmedaios - 质控科室改进建议 V14 路由（M501-C）
 *
 * POST /api/v1/emr-qc-dept-improve-suggest  （auth:true）改进建议提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildImproveReport, suggestDeptImprove } from "../aggregators/emrQcDeptImproveSuggestV14Aggregator.js";

export const emrQcDeptImproveSuggestV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-dept-improve-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-improve-suggest:write");
      if (denied) return denied;
      const body = await c.req.json();
      const dept = typeof body?.dept === "string" ? body.dept : "";
      const score = typeof body?.score === "number" ? body.score : 0;
      const result = suggestDeptImprove(dept, score);
      const report = buildImproveReport(result);
      return json(ok({ result, report }));
    },
  },
];
