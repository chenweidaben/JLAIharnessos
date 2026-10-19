/**
 * 健澜科技 jlmedaios - 病历AI处方前置审核 V14 路由（M565-A）
 *
 * GET  /api/v1/emr-ai-pre-prescription-review  （read，auth:true）返回 AI 处方前置审核基础数据
 * POST /api/v1/emr-ai-pre-prescription-review  （auth:true）AI 处方前置审核 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiPrePrescriptionReview,
  buildAiPrePrescriptionReviewReport,
  reviewPrePrescriptionByAi,
  type AiPrePrescriptionReviewInputV14,
} from "../aggregators/emrAiPrePrescriptionReviewV14Aggregator.js";

export const emrAiPrePrescriptionReviewV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-pre-prescription-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-pre-prescription-review:read");
      if (denied) return denied;
      const base = buildAiPrePrescriptionReview("RECB082", "药剂科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-pre-prescription-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-pre-prescription-review:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiPrePrescriptionReviewInputV14 = {
        drugName: String(obj?.drugName ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
        hasAllergy: Boolean(obj?.hasAllergy ?? false),
      };
      const result = reviewPrePrescriptionByAi(input);
      const report = buildAiPrePrescriptionReviewReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
