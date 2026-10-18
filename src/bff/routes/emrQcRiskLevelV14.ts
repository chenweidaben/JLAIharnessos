/**
 * 健澜科技 jlmedaios - 质控风险等级评估 V14 路由（M495-C）
 *
 * GET /api/v1/emr-qc-risk-level  （read，auth:true）返回风险等级数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { assessRiskLevel, buildRiskLevelReport } from "../aggregators/emrQcRiskLevelV14Aggregator.js";

const sampleScores = [95, 80, 60];

export const emrQcRiskLevelV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-risk-level",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-risk-level:read");
      if (denied) return denied;
      const assessments = sampleScores.map((s) => assessRiskLevel(s));
      const reports = assessments.map((a) => buildRiskLevelReport(a.level, a.score));
      return json(ok({ assessments, reports }));
    },
  },
];
