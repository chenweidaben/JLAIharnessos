/**
 * 健澜科技 jlmedaios - 病历AI医嘱推荐 V14 路由（M546-B）
 *
 * GET  /api/v1/emr-ai-order-reco  （read，auth:true）返回 AI 医嘱推荐基础数据
 * POST /api/v1/emr-ai-order-reco  （auth:true）AI 医嘱推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiOrderReco,
  buildAiOrderRecoReport,
  recommendOrderByAi,
  type AiOrderRecoInputV14,
} from "../aggregators/emrAiOrderRecoV14Aggregator.js";

export const emrAiOrderRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-order-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-order-reco:read");
      if (denied) return denied;
      const base = buildAiOrderReco("RECB006", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-order-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-order-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiOrderRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
      };
      const result = recommendOrderByAi(input);
      const report = buildAiOrderRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
