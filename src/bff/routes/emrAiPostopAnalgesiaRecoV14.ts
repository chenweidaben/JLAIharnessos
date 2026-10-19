/**
 * 健澜科技 jlmedaios - 病历AI术后镇痛方案推荐 V14 路由（M562-D）
 *
 * GET  /api/v1/emr-ai-postop-analgesia-reco  （read，auth:true）返回 AI 术后镇痛方案推荐基础数据
 * POST /api/v1/emr-ai-postop-analgesia-reco  （auth:true）AI 术后镇痛方案推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiPostopAnalgesiaReco,
  buildAiPostopAnalgesiaRecoReport,
  recommendPostopAnalgesiaByAi,
  type AiPostopAnalgesiaRecoInputV14,
} from "../aggregators/emrAiPostopAnalgesiaRecoV14Aggregator.js";

export const emrAiPostopAnalgesiaRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-postop-analgesia-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-postop-analgesia-reco:read");
      if (denied) return denied;
      const base = buildAiPostopAnalgesiaReco("RECB073", "外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-postop-analgesia-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-postop-analgesia-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiPostopAnalgesiaRecoInputV14 = {
        surgeryType: String(obj?.surgeryType ?? ""),
        painScore: Number(obj?.painScore ?? 0),
      };
      const result = recommendPostopAnalgesiaByAi(input);
      const report = buildAiPostopAnalgesiaRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
