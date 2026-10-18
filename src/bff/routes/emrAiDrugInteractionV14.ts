/**
 * 健澜科技 jlmedaios - 病历AI用药相互作用审查 V14 路由（M550-C）
 *
 * GET  /api/v1/emr-ai-drug-interaction  （read，auth:true）返回 AI 用药相互作用审查基础数据
 * POST /api/v1/emr-ai-drug-interaction  （auth:true）AI 用药相互作用审查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDrugInteraction,
  buildAiDrugInteractionReport,
  checkDrugInteractionByAi,
  type AiDrugInteractionInputV14,
} from "../aggregators/emrAiDrugInteractionV14Aggregator.js";

export const emrAiDrugInteractionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-drug-interaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-drug-interaction:read");
      if (denied) return denied;
      const base = buildAiDrugInteraction("RECB023", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-drug-interaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-drug-interaction:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDrugInteractionInputV14 = {
        drugA: String(obj?.drugA ?? ""),
        drugB: String(obj?.drugB ?? ""),
      };
      const result = checkDrugInteractionByAi(input);
      const report = buildAiDrugInteractionReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
