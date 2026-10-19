/**
 * 健澜科技 jlmedaios - 病历AI病案首页智能编码 V14 路由（M556-A）
 *
 * GET  /api/v1/emr-ai-frontpage-smart-coding  （read，auth:true）返回 AI 病案首页智能编码基础数据
 * POST /api/v1/emr-ai-frontpage-smart-coding  （auth:true）AI 病案首页智能编码 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiFrontpageSmartCoding,
  buildAiFrontpageSmartCodingReport,
  codeFrontpageByAi,
  type AiFrontpageSmartCodingInputV14,
} from "../aggregators/emrAiFrontpageSmartCodingV14Aggregator.js";

export const emrAiFrontpageSmartCodingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-frontpage-smart-coding",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-frontpage-smart-coding:read");
      if (denied) return denied;
      const base = buildAiFrontpageSmartCoding("RECB045", "病案室");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-frontpage-smart-coding",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-frontpage-smart-coding:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiFrontpageSmartCodingInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
      };
      const result = codeFrontpageByAi(input);
      const report = buildAiFrontpageSmartCodingReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
