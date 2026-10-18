/**
 * 健澜科技 jlmedaios - 病历质量综合评分 V14 路由（M536-A）
 *
 * GET  /api/v1/emr-quality-score-comprehensive  （read，auth:true）返回质量综合评分基础数据
 * POST /api/v1/emr-quality-score-comprehensive  （auth:true）质量综合评分 + 构建报告
 * 避让 M465-B 旧 emrQualityScoreV14（实时评分仪表盘），采用 -comprehensive 后缀。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQualityScoreComprehensive,
  buildQualityScoreComprehensiveReport,
  computeQualityScoreComprehensive,
  type QualityScoreComprehensiveInputV14,
} from "../aggregators/emrQualityScoreComprehensiveV14Aggregator.js";

export const emrQualityScoreComprehensiveV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-quality-score-comprehensive",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-score-comprehensive:read");
      if (denied) return denied;
      const score = buildQualityScoreComprehensive("REC300", "心内科");
      return json(ok(score));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-quality-score-comprehensive",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-score-comprehensive:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: QualityScoreComprehensiveInputV14 = {
        block: Number(obj?.block ?? 0),
        major: Number(obj?.major ?? 0),
        minor: Number(obj?.minor ?? 0),
      };
      const result = computeQualityScoreComprehensive(input);
      const report = buildQualityScoreComprehensiveReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
