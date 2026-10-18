/**
 * 健澜科技 jlmedaios - 病历终末质控评分 V14 路由（M527-B）
 *
 * GET  /api/v1/emr-final-qc-score  （read，auth:true）返回终末评分基础数据
 * POST /api/v1/emr-final-qc-score  （auth:true）终末评分 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFinalQcScore,
  buildFinalQcScoreReport,
  calculateFinalScore,
  type FinalQcScoreInputV14,
} from "../aggregators/emrFinalQcScoreV14Aggregator.js";

export const emrFinalQcScoreV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-final-qc-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-final-qc-score:read");
      if (denied) return denied;
      const score = buildFinalQcScore("REC040", "心内科");
      return json(ok(score));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-final-qc-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-final-qc-score:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: FinalQcScoreInputV14 = {
        blockDefects: Number(body?.blockDefects ?? 0),
        majorDefects: Number(body?.majorDefects ?? 0),
        minorDefects: Number(body?.minorDefects ?? 0),
      };
      const result = calculateFinalScore(input);
      const report = buildFinalQcScoreReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
