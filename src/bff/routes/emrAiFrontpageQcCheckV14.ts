/**
 * 健澜科技 jlmedaios - 病历AI首页质控检查 V14 路由（M551-A）
 *
 * GET  /api/v1/emr-ai-frontpage-qc-check  （read，auth:true）返回 AI 首页质控检查基础数据
 * POST /api/v1/emr-ai-frontpage-qc-check  （auth:true）AI 首页质控检查 + 构建报告
 * 避让说明：M544-C 已有 emrAiFrontpageQcV14，本切片用 -check 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiFrontpageQcCheck,
  buildAiFrontpageQcCheckReport,
  checkFrontpageQcByAi,
  type AiFrontpageQcCheckInputV14,
} from "../aggregators/emrAiFrontpageQcCheckV14Aggregator.js";

export const emrAiFrontpageQcCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-frontpage-qc-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-frontpage-qc-check:read");
      if (denied) return denied;
      const base = buildAiFrontpageQcCheck("RECB025", "病案室");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-frontpage-qc-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-frontpage-qc-check:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiFrontpageQcCheckInputV14 = {
        hasMainDx: Boolean(obj?.hasMainDx ?? false),
        hasMainOp: Boolean(obj?.hasMainOp ?? false),
        hasOutcome: Boolean(obj?.hasOutcome ?? false),
        hasCost: Boolean(obj?.hasCost ?? false),
      };
      const result = checkFrontpageQcByAi(input);
      const report = buildAiFrontpageQcCheckReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
