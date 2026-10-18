/**
 * 健澜科技 jlmedaios - AI病历缺陷根因分析 V14 路由（M522-C）
 *
 * GET  /api/v1/emr-ai-defect-root-cause  （read，auth:true）返回根因分析基础数据
 * POST /api/v1/emr-ai-defect-root-cause  （auth:true）根因分析 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDefectRootCause,
  buildAiDefectRootCauseReport,
  analyzeRootCause,
  type AiDefectRootCauseInputV14,
} from "../aggregators/emrAiDefectRootCauseV14Aggregator.js";

export const emrAiDefectRootCauseV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-defect-root-cause",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-defect-root-cause:read");
      if (denied) return denied;
      const rootCause = buildAiDefectRootCause("D010", "时限类");
      return json(ok(rootCause));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-defect-root-cause",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-defect-root-cause:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: AiDefectRootCauseInputV14 = {
        defectType: String(body?.defectType ?? "时限类"),
        freq: Number(body?.freq ?? 15),
        severity: String(body?.severity ?? "major"),
      };
      const result = analyzeRootCause(input);
      const report = buildAiDefectRootCauseReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
