/**
 * 健澜科技 jlmedaios - 病历AI质控实时预警 V14 路由（M549-A）
 *
 * GET  /api/v1/emr-ai-qc-realtime-alert  （read，auth:true）返回 AI 实时预警基础数据
 * POST /api/v1/emr-ai-qc-realtime-alert  （auth:true）AI 实时预警检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQcRealtimeAlert,
  buildAiQcRealtimeAlertReport,
  checkQcRealtimeAlertByAi,
  type AiQcRealtimeAlertInputV14,
} from "../aggregators/emrAiQcRealtimeAlertV14Aggregator.js";

export const emrAiQcRealtimeAlertV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-qc-realtime-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-realtime-alert:read");
      if (denied) return denied;
      const base = buildAiQcRealtimeAlert("RECB017", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-qc-realtime-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-realtime-alert:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiQcRealtimeAlertInputV14 = {
        defectCount: Number(obj?.defectCount ?? 0),
        threshold: Number(obj?.threshold ?? 0),
      };
      const result = checkQcRealtimeAlertByAi(input);
      const report = buildAiQcRealtimeAlertReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
