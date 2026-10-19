/**
 * 健澜科技 jlmedaios - 病历AI出院随访计划推荐 V14 路由（M563-C）
 *
 * GET  /api/v1/emr-ai-discharge-followup-reco  （read，auth:true）返回 AI 出院随访计划推荐基础数据
 * POST /api/v1/emr-ai-discharge-followup-reco  （auth:true）AI 出院随访计划推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDischargeFollowupReco,
  buildAiDischargeFollowupRecoReport,
  recommendDischargeFollowupByAi,
  type AiDischargeFollowupRecoInputV14,
} from "../aggregators/emrAiDischargeFollowupRecoV14Aggregator.js";

export const emrAiDischargeFollowupRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-discharge-followup-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-discharge-followup-reco:read");
      if (denied) return denied;
      const base = buildAiDischargeFollowupReco("RECB076", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-discharge-followup-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-discharge-followup-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDischargeFollowupRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        dischargeDay: Number(obj?.dischargeDay ?? 0),
      };
      const result = recommendDischargeFollowupByAi(input);
      const report = buildAiDischargeFollowupRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
