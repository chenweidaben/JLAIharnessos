/**
 * 健澜科技 jlmedaios - 质控评分自动计算 V14 路由（M492-B）
 *
 * POST /api/v1/emr-qc-score-calc  （auth:true，body 用 await c.req.json()）执行自动评分
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { calculateQcScore, buildScoreCalcReport, type DeductionV14 } from "../aggregators/emrQcScoreCalcV14Aggregator.js";

export const emrQcScoreCalcV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-score-calc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-score-calc:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        deductions?: DeductionV14[];
      };
      const deductions = body.deductions ?? [];
      const score = calculateQcScore(deductions);
      const report = buildScoreCalcReport(deductions);
      return json(ok({ score, report }));
    },
  },
];
