/**
 * 健澜科技 jlmedaios - 病历AI护理建议 V14 路由（M546-A）
 *
 * GET  /api/v1/emr-ai-nursing-reco  （read，auth:true）返回 AI 护理建议基础数据
 * POST /api/v1/emr-ai-nursing-reco  （auth:true）AI 护理建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiNursingReco,
  buildAiNursingRecoReport,
  recommendNursingByAi,
  type AiNursingRecoInputV14,
} from "../aggregators/emrAiNursingRecoV14Aggregator.js";

export const emrAiNursingRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-nursing-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-reco:read");
      if (denied) return denied;
      const base = buildAiNursingReco("RECB005", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-nursing-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiNursingRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        age: Number(obj?.age ?? 0),
      };
      const result = recommendNursingByAi(input);
      const report = buildAiNursingRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
