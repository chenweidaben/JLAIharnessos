/**
 * 健澜科技 jlmedaios - 病历AI复诊提醒 V14 路由（M547-D，M547 收官）
 *
 * GET  /api/v1/emr-ai-followup-remind  （read，auth:true）返回 AI 复诊提醒基础数据
 * POST /api/v1/emr-ai-followup-remind  （auth:true）AI 复诊提醒 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiFollowupRemind,
  buildAiFollowupRemindReport,
  remindFollowupByAi,
  type AiFollowupRemindInputV14,
} from "../aggregators/emrAiFollowupRemindV14Aggregator.js";

export const emrAiFollowupRemindV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-followup-remind",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-followup-remind:read");
      if (denied) return denied;
      const base = buildAiFollowupRemind("RECB012", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-followup-remind",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-followup-remind:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiFollowupRemindInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        daysSinceDischarge: Number(obj?.daysSinceDischarge ?? 0),
      };
      const result = remindFollowupByAi(input);
      const report = buildAiFollowupRemindReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
