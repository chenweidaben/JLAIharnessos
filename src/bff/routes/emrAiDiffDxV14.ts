/**
 * 健澜科技 jlmedaios - 病历AI鉴别诊断 V14 路由（M545-B）
 *
 * GET  /api/v1/emr-ai-diff-dx  （read，auth:true）返回 AI 鉴别诊断基础数据
 * POST /api/v1/emr-ai-diff-dx  （auth:true）AI 鉴别诊断建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDiffDx,
  buildAiDiffDxReport,
  suggestDiffDx,
  type AiDiffDxInputV14,
} from "../aggregators/emrAiDiffDxV14Aggregator.js";

export const emrAiDiffDxV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-diff-dx",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-diff-dx:read");
      if (denied) return denied;
      const base = buildAiDiffDx("RECB002", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-diff-dx",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-diff-dx:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDiffDxInputV14 = {
        symptom: String(obj?.symptom ?? ""),
      };
      const result = suggestDiffDx(input);
      const report = buildAiDiffDxReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
