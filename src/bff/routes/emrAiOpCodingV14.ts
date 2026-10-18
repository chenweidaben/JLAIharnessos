/**
 * 健澜科技 jlmedaios - 病历AI手术编码建议 V14 路由（M544-B）
 *
 * GET  /api/v1/emr-ai-op-coding  （read，auth:true）返回 AI 手术编码基础数据
 * POST /api/v1/emr-ai-op-coding  （auth:true）AI 手术编码建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiOpCoding,
  buildAiOpCodingReport,
  suggestOpCodingByAi,
  type AiOpCodingInputV14,
} from "../aggregators/emrAiOpCodingV14Aggregator.js";

export const emrAiOpCodingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-op-coding",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-op-coding:read");
      if (denied) return denied;
      const base = buildAiOpCoding("RECA002", "心外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-op-coding",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-op-coding:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiOpCodingInputV14 = {
        opName: String(obj?.opName ?? ""),
      };
      const result = suggestOpCodingByAi(input);
      const report = buildAiOpCodingReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
