/**
 * 健澜科技 jlmedaios - 病历AI病案首页质控 V14 路由（M544-C）
 *
 * GET  /api/v1/emr-ai-frontpage-qc  （read，auth:true）返回 AI 首页质控基础数据
 * POST /api/v1/emr-ai-frontpage-qc  （auth:true）AI 首页质控 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiFrontpageQc,
  buildAiFrontpageQcReport,
  qcFrontpageByAi,
  type AiFrontpageQcInputV14,
} from "../aggregators/emrAiFrontpageQcV14Aggregator.js";

export const emrAiFrontpageQcV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-frontpage-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-frontpage-qc:read");
      if (denied) return denied;
      const base = buildAiFrontpageQc("RECA003", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-frontpage-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-frontpage-qc:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiFrontpageQcInputV14 = {
        hasMainDx: Boolean(obj?.hasMainDx ?? false),
        hasMainOp: Boolean(obj?.hasMainOp ?? false),
        hasOutcome: Boolean(obj?.hasOutcome ?? false),
      };
      const result = qcFrontpageByAi(input);
      const report = buildAiFrontpageQcReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
