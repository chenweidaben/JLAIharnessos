/**
 * 健澜科技 jlmedaios - 病历AI检验解读 V14 路由（M545-D，M545 收官）
 *
 * GET  /api/v1/emr-ai-lab-interpret  （read，auth:true）返回 AI 检验解读基础数据
 * POST /api/v1/emr-ai-lab-interpret  （auth:true）AI 检验解读 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiLabInterpret,
  buildAiLabInterpretReport,
  interpretLabByAi,
  type AiLabInterpretInputV14,
} from "../aggregators/emrAiLabInterpretV14Aggregator.js";

export const emrAiLabInterpretV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-lab-interpret",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-lab-interpret:read");
      if (denied) return denied;
      const base = buildAiLabInterpret("RECB004", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-lab-interpret",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-lab-interpret:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiLabInterpretInputV14 = {
        item: String(obj?.item ?? ""),
        value: Number(obj?.value ?? 0),
        refRange: String(obj?.refRange ?? ""),
      };
      const result = interpretLabByAi(input);
      const report = buildAiLabInterpretReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
