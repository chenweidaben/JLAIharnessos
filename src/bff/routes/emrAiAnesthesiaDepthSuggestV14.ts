/**
 * 健澜科技 jlmedaios - 病历AI麻醉深度监测建议 V14 路由（M562-C）
 *
 * GET  /api/v1/emr-ai-anesthesia-depth-suggest  （read，auth:true）返回 AI 麻醉深度监测建议基础数据
 * POST /api/v1/emr-ai-anesthesia-depth-suggest  （auth:true）AI 麻醉深度监测建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiAnesthesiaDepthSuggest,
  buildAiAnesthesiaDepthSuggestReport,
  suggestAnesthesiaDepthByAi,
  type AiAnesthesiaDepthSuggestInputV14,
} from "../aggregators/emrAiAnesthesiaDepthSuggestV14Aggregator.js";

export const emrAiAnesthesiaDepthSuggestV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-anesthesia-depth-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-anesthesia-depth-suggest:read");
      if (denied) return denied;
      const base = buildAiAnesthesiaDepthSuggest("RECB072", "麻醉科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-anesthesia-depth-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-anesthesia-depth-suggest:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiAnesthesiaDepthSuggestInputV14 = {
        surgeryType: String(obj?.surgeryType ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
      };
      const result = suggestAnesthesiaDepthByAi(input);
      const report = buildAiAnesthesiaDepthSuggestReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
