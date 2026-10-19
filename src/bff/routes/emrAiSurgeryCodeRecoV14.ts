/**
 * 健澜科技 jlmedaios - 病历AI手术编码推荐 V14 路由（M551-C）
 *
 * GET  /api/v1/emr-ai-surgery-code-reco  （read，auth:true）返回 AI 手术编码推荐基础数据
 * POST /api/v1/emr-ai-surgery-code-reco  （auth:true）AI 手术编码推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiSurgeryCodeReco,
  buildAiSurgeryCodeRecoReport,
  recommendSurgeryCodeByAi,
  type AiSurgeryCodeRecoInputV14,
} from "../aggregators/emrAiSurgeryCodeRecoV14Aggregator.js";

export const emrAiSurgeryCodeRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-surgery-code-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-surgery-code-reco:read");
      if (denied) return denied;
      const base = buildAiSurgeryCodeReco("RECB027", "心外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-surgery-code-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-surgery-code-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiSurgeryCodeRecoInputV14 = {
        surgeryName: String(obj?.surgeryName ?? ""),
      };
      const result = recommendSurgeryCodeByAi(input);
      const report = buildAiSurgeryCodeRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
