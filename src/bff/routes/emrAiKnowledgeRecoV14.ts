/**
 * 健澜科技 jlmedaios - 病历AI知识推荐 V14 路由（M543-D，M543 收官）
 *
 * GET  /api/v1/emr-ai-knowledge-reco  （read，auth:true）返回 AI 知识推荐基础数据
 * POST /api/v1/emr-ai-knowledge-reco  （auth:true）AI 知识推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiKnowledgeReco,
  buildAiKnowledgeRecoReport,
  recommendKnowledgeByAi,
  type AiKnowledgeRecoInputV14,
} from "../aggregators/emrAiKnowledgeRecoV14Aggregator.js";

export const emrAiKnowledgeRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-knowledge-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-knowledge-reco:read");
      if (denied) return denied;
      const base = buildAiKnowledgeReco("REC903", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-knowledge-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-knowledge-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiKnowledgeRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        specialty: String(obj?.specialty ?? ""),
      };
      const result = recommendKnowledgeByAi(input);
      const report = buildAiKnowledgeRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
