/**
 * 健澜科技 jlmedaios - 病历AI转诊建议 V14 路由（M547-C）
 *
 * GET  /api/v1/emr-ai-referral-suggest  （read，auth:true）返回 AI 转诊建议基础数据
 * POST /api/v1/emr-ai-referral-suggest  （auth:true）AI 转诊建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiReferralSuggest,
  buildAiReferralSuggestReport,
  suggestReferralByAi,
  type AiReferralSuggestInputV14,
} from "../aggregators/emrAiReferralSuggestV14Aggregator.js";

export const emrAiReferralSuggestV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-referral-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-referral-suggest:read");
      if (denied) return denied;
      const base = buildAiReferralSuggest("RECB011", "急诊科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-referral-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-referral-suggest:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiReferralSuggestInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        severity: Number(obj?.severity ?? 0),
      };
      const result = suggestReferralByAi(input);
      const report = buildAiReferralSuggestReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
