/**
 * 健澜科技 jlmedaios - 病历AI ICD 编码推荐 V14 路由（M551-B）
 *
 * GET  /api/v1/emr-ai-icd-reco  （read，auth:true）返回 AI ICD 编码推荐基础数据
 * POST /api/v1/emr-ai-icd-reco  （auth:true）AI ICD 编码推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiIcdReco,
  buildAiIcdRecoReport,
  recommendIcdByAi,
  type AiIcdRecoInputV14,
} from "../aggregators/emrAiIcdRecoV14Aggregator.js";

export const emrAiIcdRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-icd-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-icd-reco:read");
      if (denied) return denied;
      const base = buildAiIcdReco("RECB026", "呼吸科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-icd-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-icd-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiIcdRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
      };
      const result = recommendIcdByAi(input);
      const report = buildAiIcdRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
