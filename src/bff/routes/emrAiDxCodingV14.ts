/**
 * 健澜科技 jlmedaios - 病历AI诊断编码建议 V14 路由（M544-A）
 *
 * GET  /api/v1/emr-ai-dx-coding  （read，auth:true）返回 AI 诊断编码基础数据
 * POST /api/v1/emr-ai-dx-coding  （auth:true）AI 诊断编码建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDxCoding,
  buildAiDxCodingReport,
  suggestDxCodingByAi,
  type AiDxCodingInputV14,
} from "../aggregators/emrAiDxCodingV14Aggregator.js";

export const emrAiDxCodingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-dx-coding",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-dx-coding:read");
      if (denied) return denied;
      const base = buildAiDxCoding("RECA001", "呼吸科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-dx-coding",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-dx-coding:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDxCodingInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
      };
      const result = suggestDxCodingByAi(input);
      const report = buildAiDxCodingReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
