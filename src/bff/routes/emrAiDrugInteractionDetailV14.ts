/**
 * 健澜科技 jlmedaios - 病历AI药品相互作用明细审查 V14 路由（M565-C，-detail 后缀避让 emrAiDrugInteractionV14）
 *
 * GET  /api/v1/emr-ai-drug-interaction-detail  （read，auth:true）返回 AI 药品相互作用明细审查基础数据
 * POST /api/v1/emr-ai-drug-interaction-detail  （auth:true）AI 药品相互作用明细审查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDrugInteractionDetail,
  buildAiDrugInteractionDetailReport,
  detailDrugInteractionByAi,
  type AiDrugInteractionDetailInputV14,
} from "../aggregators/emrAiDrugInteractionDetailV14Aggregator.js";

export const emrAiDrugInteractionDetailV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-drug-interaction-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-drug-interaction-detail:read");
      if (denied) return denied;
      const base = buildAiDrugInteractionDetail("RECB084", "药剂科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-drug-interaction-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-drug-interaction-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDrugInteractionDetailInputV14 = {
        drugA: String(obj?.drugA ?? ""),
        drugB: String(obj?.drugB ?? ""),
      };
      const result = detailDrugInteractionByAi(input);
      const report = buildAiDrugInteractionDetailReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
