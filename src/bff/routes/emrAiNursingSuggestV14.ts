/**
 * 健澜科技 jlmedaios - 病历AI护理建议 V14 路由（M546-C，-suggest 后缀避让旧作废 -reco）
 *
 * GET  /api/v1/emr-ai-nursing-suggest  （read，auth:true）返回 AI 护理建议基础数据
 * POST /api/v1/emr-ai-nursing-suggest  （auth:true）AI 护理建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiNursingSuggest,
  buildAiNursingSuggestReport,
  suggestNursingByAi,
  type AiNursingSuggestInputV14,
} from "../aggregators/emrAiNursingSuggestV14Aggregator.js";

export const emrAiNursingSuggestV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-nursing-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-suggest:read");
      if (denied) return denied;
      const base = buildAiNursingSuggest("RECB007", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-nursing-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-suggest:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiNursingSuggestInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        age: Number(obj?.age ?? 0),
      };
      const result = suggestNursingByAi(input);
      const report = buildAiNursingSuggestReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
