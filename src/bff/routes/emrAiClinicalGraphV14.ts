/**
 * 健澜科技 jlmedaios - 病历AI临床知识图谱 V14 路由（M550-A）
 *
 * GET  /api/v1/emr-ai-clinical-graph  （read，auth:true）返回 AI 临床知识图谱基础数据
 * POST /api/v1/emr-ai-clinical-graph  （auth:true）AI 临床知识图谱查询 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiClinicalGraph,
  buildAiClinicalGraphReport,
  queryClinicalGraphByAi,
  type AiClinicalGraphInputV14,
} from "../aggregators/emrAiClinicalGraphV14Aggregator.js";

export const emrAiClinicalGraphV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-clinical-graph",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-clinical-graph:read");
      if (denied) return denied;
      const base = buildAiClinicalGraph("RECB021", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-clinical-graph",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-clinical-graph:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiClinicalGraphInputV14 = {
        node: String(obj?.node ?? ""),
      };
      const result = queryClinicalGraphByAi(input);
      const report = buildAiClinicalGraphReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
