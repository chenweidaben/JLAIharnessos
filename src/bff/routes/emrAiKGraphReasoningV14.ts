/**
 * 健澜科技 jlmedaios - AI病历质控知识图谱推理 V14 路由（M522-D，M522 收官）
 *
 * GET  /api/v1/emr-ai-kgraph-reasoning  （read，auth:true）返回知识图谱推理基础数据
 * POST /api/v1/emr-ai-kgraph-reasoning  （auth:true）知识图谱推理 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiKGraphReasoning,
  buildAiKGraphReasoningReport,
  reasonKGraph,
  type AiKGraphReasoningInputV14,
} from "../aggregators/emrAiKGraphReasoningV14Aggregator.js";

export const emrAiKGraphReasoningV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-kgraph-reasoning",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-kgraph-reasoning:read");
      if (denied) return denied;
      const reasoning = buildAiKGraphReasoning("病历质控", 150);
      return json(ok(reasoning));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-kgraph-reasoning",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-kgraph-reasoning:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: AiKGraphReasoningInputV14 = {
        query: String(body?.query ?? "病历"),
        nodes: Array.isArray(body?.nodes) ? body.nodes.map((n: unknown) => String(n)) : [],
      };
      const result = reasonKGraph(input);
      const report = buildAiKGraphReasoningReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
