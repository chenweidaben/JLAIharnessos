/**
 * 健澜科技 jlmedaios - 病历AI质控异常监控 V14 路由（M549-B）
 *
 * GET  /api/v1/emr-ai-qc-anomaly-monitor  （read，auth:true）返回 AI 异常监控基础数据
 * POST /api/v1/emr-ai-qc-anomaly-monitor  （auth:true）AI 异常监控 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQcAnomalyMonitor,
  buildAiQcAnomalyMonitorReport,
  monitorQcAnomalyByAi,
  type AiQcAnomalyMonitorInputV14,
} from "../aggregators/emrAiQcAnomalyMonitorV14Aggregator.js";

export const emrAiQcAnomalyMonitorV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-qc-anomaly-monitor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-anomaly-monitor:read");
      if (denied) return denied;
      const base = buildAiQcAnomalyMonitor("RECB018", "医务处");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-qc-anomaly-monitor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-anomaly-monitor:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiQcAnomalyMonitorInputV14 = {
        currentDefect: Number(obj?.currentDefect ?? 0),
        avgDefect: Number(obj?.avgDefect ?? 0),
      };
      const result = monitorQcAnomalyByAi(input);
      const report = buildAiQcAnomalyMonitorReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
