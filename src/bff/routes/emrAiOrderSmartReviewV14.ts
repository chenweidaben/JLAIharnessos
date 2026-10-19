/**
 * 健澜科技 jlmedaios - 病历AI医嘱智能审核 V14 路由（M558-A）
 *
 * GET  /api/v1/emr-ai-order-smart-review  （read，auth:true）返回 AI 医嘱智能审核基础数据
 * POST /api/v1/emr-ai-order-smart-review  （auth:true）AI 医嘱智能审核 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiOrderSmartReview,
  buildAiOrderSmartReviewReport,
  reviewOrderByAi,
  type AiOrderSmartReviewInputV14,
} from "../aggregators/emrAiOrderSmartReviewV14Aggregator.js";

export const emrAiOrderSmartReviewV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-order-smart-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-order-smart-review:read");
      if (denied) return denied;
      const base = buildAiOrderSmartReview("RECB054", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-order-smart-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-order-smart-review:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiOrderSmartReviewInputV14 = {
        drugName: String(obj?.drugName ?? ""),
        dosage: String(obj?.dosage ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
      };
      const result = reviewOrderByAi(input);
      const report = buildAiOrderSmartReviewReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
