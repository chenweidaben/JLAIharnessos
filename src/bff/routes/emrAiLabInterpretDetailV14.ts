/**
 * 健澜科技 jlmedaios - 病历AI检验解读明细 V14 路由（M550-D，M550 收官）
 *
 * GET  /api/v1/emr-ai-lab-interpret-detail  （read，auth:true）返回 AI 检验解读明细基础数据
 * POST /api/v1/emr-ai-lab-interpret-detail  （auth:true）AI 检验解读明细 + 构建报告
 * 避让说明：M545-D 已有 emrAiLabInterpretV14，本切片用 -detail 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiLabInterpretDetail,
  buildAiLabInterpretDetailReport,
  interpretLabByAi,
  type AiLabInterpretDetailInputV14,
} from "../aggregators/emrAiLabInterpretDetailV14Aggregator.js";

export const emrAiLabInterpretDetailV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-lab-interpret-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-lab-interpret-detail:read");
      if (denied) return denied;
      const base = buildAiLabInterpretDetail("RECB024", "检验科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-lab-interpret-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-lab-interpret-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiLabInterpretDetailInputV14 = {
        item: String(obj?.item ?? ""),
        value: Number(obj?.value ?? 0),
        refLow: Number(obj?.refLow ?? 0),
        refHigh: Number(obj?.refHigh ?? 0),
      };
      const result = interpretLabByAi(input);
      const report = buildAiLabInterpretDetailReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
