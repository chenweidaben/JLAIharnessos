/**
 * 健澜科技 jlmedaios - 病历AI归档校验 V14 路由（M551-D，M551 收官）
 *
 * GET  /api/v1/emr-ai-archive-check  （read，auth:true）返回 AI 归档校验基础数据
 * POST /api/v1/emr-ai-archive-check  （auth:true）AI 病案归档校验 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiArchiveCheck,
  buildAiArchiveCheckReport,
  checkArchiveByAi,
  type AiArchiveCheckInputV14,
} from "../aggregators/emrAiArchiveCheckV14Aggregator.js";

export const emrAiArchiveCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-archive-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-archive-check:read");
      if (denied) return denied;
      const base = buildAiArchiveCheck("RECB028", "病案室");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-archive-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-archive-check:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiArchiveCheckInputV14 = {
        hasCompleteRecord: Boolean(obj?.hasCompleteRecord ?? false),
        hasSigned: Boolean(obj?.hasSigned ?? false),
        hasCoded: Boolean(obj?.hasCoded ?? false),
      };
      const result = checkArchiveByAi(input);
      const report = buildAiArchiveCheckReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
